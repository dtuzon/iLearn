import { prisma } from '../../lib/prisma';
import { SubmissionStatus, ModuleType } from '@prisma/client';
import puppeteer from 'puppeteer';

import path from 'path';
import fs from 'fs';

export class CertificatesService {
  static async createTemplate(courseId: string, data: { designConfig: any; backgroundImageUrl?: string; signatureImageUrl?: string }) {
    return prisma.certificateTemplate.upsert({
      where: { courseId },
      update: data,
      create: {
        ...data,
        courseId
      }
    });
  }

  static async generateCertificate(userId: string, courseId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { certificateTemplate: true }
    });

    if (!user || !course || !course.certificateTemplate) {
      throw new Error('User, Course, or Certificate Template not found');
    }

    // GATING LOGIC: Check if all WORKSHOP modules are APPROVED
    const workshopModules = await prisma.courseModule.findMany({
      where: { courseId, type: ModuleType.WORKSHOP }
    });

    if (workshopModules.length > 0) {
      const submissions = await prisma.activitySubmission.findMany({
        where: {
          userId,
          moduleId: { in: workshopModules.map(m => m.id) }
        }
      });

      const allApproved = workshopModules.every(m => {
        const sub = submissions.find(s => s.moduleId === m.id);
        return sub && sub.status === SubmissionStatus.APPROVED;
      });

      if (!allApproved) {
        throw new Error('Your certificate is locked pending activity approval. Please wait for your assigned checker to review your submissions.');
      }
    }


    const template = course.certificateTemplate;
    const config = template.designConfig as any;
    const placeholders = config.placeholders || [];

    // Map data to placeholders
    const studentName = `${user.firstName} ${user.lastName}`;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // HTML Content
    let html = `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; width: 1123px; height: 794px; position: relative; font-family: sans-serif; }
            .background { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: -1; }
            .placeholder { position: absolute; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; }
          </style>
        </head>
        <body>
          <img class="background" src="file://${path.resolve(template.backgroundImageUrl || '')}" />
    `;

    for (const p of placeholders) {
      let value = '';
      if (p.key === '{{StudentName}}') value = studentName;
      if (p.key === '{{CourseName}}') value = course.title;
      if (p.key === '{{Date}}') value = date;

      html += `
        <div class="placeholder" style="left: ${p.x}px; top: ${p.y}px; font-size: ${p.fontSize}px; color: ${p.color}; font-family: ${p.fontFamily}; font-weight: ${p.fontWeight};">
          ${value}
        </div>
      `;
    }

    html += `</body></html>`;

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const fileName = `cert-${userId}-${courseId}-${Date.now()}.pdf`;
    const outputPath = path.join('uploads/generated-pdfs', fileName);
    
    await page.pdf({
      path: outputPath,
      width: '1123px',
      height: '794px',
      printBackground: true
    });

    await browser.close();

    // Create Transcript record
    return prisma.transcript.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        certificatePdfUrl: `/uploads/generated-pdfs/${fileName}`,
        completionDate: new Date()
      },
      create: {
        userId,
        courseId,
        certificatePdfUrl: `/uploads/generated-pdfs/${fileName}`,
        completionDate: new Date()
      }
    });
  }
}
