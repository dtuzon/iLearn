import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { generateSDKSignature } from '../../services/zoom.service';
import { prisma } from '../../lib/prisma';

const router = Router();

// All Zoom API routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/zoom/signature
// Body: { meetingNumber: string, role: 0 | 1 }
// Returns: { signature: string }
// Used by the frontend ZoomMeetingPlayer to join a meeting via the SDK.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/signature', (req: Request, res: Response) => {
  try {
    const { meetingNumber, role } = req.body;

    if (!meetingNumber || role === undefined) {
      return res.status(400).json({ message: 'meetingNumber and role are required.' });
    }

    const numericRole = Number(role) as 0 | 1;
    if (numericRole !== 0 && numericRole !== 1) {
      return res.status(400).json({ message: 'role must be 0 (attendee) or 1 (host).' });
    }

    const signature = generateSDKSignature(String(meetingNumber), numericRole);
    return res.json({ signature, sdkKey: process.env.ZOOM_SDK_KEY });
  } catch (error: any) {
    console.error('[Zoom Router] /signature error:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/zoom/session/:batchId/:moduleId
// Returns the BatchLiveSession record for a given batch + module.
// Used by the learner's ZoomMeetingPlayer to retrieve join credentials.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/session/:batchId/:moduleId', async (req: Request, res: Response) => {
  try {
    const batchId = String(req.params.batchId);
    const moduleId = String(req.params.moduleId);
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Check enrollment for learners to prevent IDOR
    if (userRole !== 'ADMIN' && userRole !== 'CREATOR' && userRole !== 'CHECKER') {
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, batchId }
      });
      const lpEnrollment = await prisma.learningPathEnrollment.findFirst({
        where: { userId, batchId }
      });

      if (!enrollment && !lpEnrollment) {
        return res.status(403).json({ message: 'Access denied. You are not enrolled in this batch.' });
      }
    }

    const session = await prisma.batchLiveSession.findUnique({
      where: { batchId_courseModuleId: { batchId, courseModuleId: moduleId } },
      select: {
        id: true,
        zoomMeetingId: true,
        zoomPasscode: true,
        joinUrl: true,
        scheduledAt: true,
        topic: true,
        batchId: true,
        courseModuleId: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'No Zoom session found for this batch and module.' });
    }

    return res.json(session);
  } catch (error: any) {
    console.error('[Zoom Router] /session error:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
