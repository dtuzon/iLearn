import https from 'https';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ZoomTokenCache {
  token: string;
  expiresAt: number; // Unix ms timestamp
}

interface ZoomMeetingResult {
  id: number;
  password: string;
  join_url: string;
  start_url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory S2S token cache (survives for the process lifetime)
// For production: replace with Redis via ioredis
// ─────────────────────────────────────────────────────────────────────────────

let tokenCache: ZoomTokenCache | null = null;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (token lives 1 hour)

// ─────────────────────────────────────────────────────────────────────────────
// Helper: lightweight HTTPS POST / GET using built-in Node https module
// Avoids adding axios to the backend (keeping dependencies minimal)
// ─────────────────────────────────────────────────────────────────────────────

function httpsRequest(
  options: https.RequestOptions,
  body?: string
): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const data = raw ? JSON.parse(raw) : {};
          resolve({ statusCode: res.statusCode ?? 0, data });
        } catch {
          resolve({ statusCode: res.statusCode ?? 0, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getS2SToken
// Fetches a Server-to-Server OAuth bearer token from Zoom.
// Caches it for 55 minutes to respect the 1-hour TTL.
// ─────────────────────────────────────────────────────────────────────────────

export async function getS2SToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const accountId = process.env.ZOOM_S2S_ACCOUNT_ID;
  const clientId = process.env.ZOOM_S2S_CLIENT_ID;
  const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('[ZoomService] Missing S2S credentials in environment variables.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const { statusCode, data } = await httpsRequest(
    {
      hostname: 'zoom.us',
      path: `/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (statusCode !== 200 || !data.access_token) {
    console.error('[ZoomService] Token fetch failed:', data);
    throw new Error(`[ZoomService] Failed to fetch S2S token (HTTP ${statusCode}): ${JSON.stringify(data)}`);
  }

  tokenCache = {
    token: data.access_token as string,
    expiresAt: now + TOKEN_TTL_MS,
  };

  console.log('[ZoomService] S2S token refreshed, expires in 55 minutes.');
  return tokenCache.token;
}

// ─────────────────────────────────────────────────────────────────────────────
// createMeeting
// Creates a scheduled Zoom meeting (type 2) for a LIVE_SESSION module.
// Duration is hardcoded to 480 minutes (8 hours) per business requirement.
// ─────────────────────────────────────────────────────────────────────────────

export async function createMeeting(
  topic: string,
  startTime: Date,
  durationMinutes = 480
): Promise<ZoomMeetingResult> {
  const token = await getS2SToken();

  const body = JSON.stringify({
    topic,
    type: 2, // Scheduled meeting
    start_time: startTime.toISOString(), // Zoom expects ISO 8601 UTC
    duration: durationMinutes,
    timezone: 'Asia/Manila', // Standard Insurance is Philippines-based
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      waiting_room: true,
      approval_type: 0, // Automatically approve
      registration_type: 1,
      mute_upon_entry: true,
      auto_recording: 'none',
    },
  });

  const { statusCode, data } = await httpsRequest(
    {
      hostname: 'api.zoom.us',
      path: '/v2/users/me/meetings',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );

  if (statusCode !== 201 && statusCode !== 200) {
    console.error('[ZoomService] createMeeting failed:', data);
    throw new Error(`[ZoomService] Zoom API error (HTTP ${statusCode}): ${JSON.stringify(data)}`);
  }

  return {
    id: data.id,
    password: data.password,
    join_url: data.join_url,
    start_url: data.start_url,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateSDKSignature
// Produces a Zoom Meeting SDK v3 JWT signature using HMAC-SHA256.
// Uses Node.js built-in crypto — no jsrsasign required.
// role: 0 = attendee, 1 = host
// ─────────────────────────────────────────────────────────────────────────────

export function generateSDKSignature(meetingNumber: string, role: 0 | 1): string {
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    throw new Error('[ZoomService] Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET.');
  }

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  // Build the JWT manually (Zoom SDK v3 spec: RS256 is not used; HS256 is correct)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sdkKey,
      appKey: sdkKey,
      mn: meetingNumber,
      role,
      iat,
      exp,
      tokenExp: exp,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', sdkSecret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}
