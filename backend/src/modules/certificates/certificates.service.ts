import { prisma } from '../../lib/prisma';
import { SubmissionStatus, ModuleType } from '@prisma/client';
import puppeteer from 'puppeteer';

import path from 'path';
import fs from 'fs';

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, 
    (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function cleanCssValue(val: any, pattern: RegExp, fallback: string): string {
  const str = String(val).trim();
  return pattern.test(str) ? str : fallback;
}

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

  static async upsertLPTemplate(learningPathId: string, data: { designConfig: any; backgroundImageUrl?: string; signatureImageUrl?: string }) {
    return prisma.certificateTemplate.upsert({
      where: { learningPathId },
      update: data,
      create: {
        ...data,
        learningPathId
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
          <img class="background" src="file://${path.join(process.cwd(), 'public', template.backgroundImageUrl || '')}" />

    `;

    for (const p of placeholders) {
      let value = '';
      if (p.key === '{{StudentName}}') value = studentName;
      if (p.key === '{{CourseName}}') value = course.title;
      if (p.key === '{{Date}}') value = date;

      const safeLeft = cleanCssValue(p.x, /^[0-9]+(?:\.[0-9]+)?$/, '0');
      const safeTop = cleanCssValue(p.y, /^[0-9]+(?:\.[0-9]+)?$/, '0');
      const safeFontSize = cleanCssValue(p.fontSize, /^[0-9]+(?:\.[0-9]+)?$/, '12');
      const safeColor = cleanCssValue(p.color, /^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|[a-zA-Z]{3,20})$/, '#000000');
      const safeFontFamily = cleanCssValue(p.fontFamily, /^[a-zA-Z0-9\s\-',]+$/, 'sans-serif');
      const safeFontWeight = cleanCssValue(p.fontWeight, /^[a-zA-Z0-9]+$/, 'normal');

      html += `
        <div class="placeholder" style="left: ${safeLeft}px; top: ${safeTop}px; font-size: ${safeFontSize}px; color: ${safeColor}; font-family: ${safeFontFamily}; font-weight: ${safeFontWeight};">
          ${escapeHtml(value)}
        </div>
      `;
    }

    html += `</body></html>`;

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true
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

  static async generateLearningPathCertificate(userId: string, learningPathId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const lp = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: { certificateTemplate: true }
    });

    if (!user || !lp || !lp.certificateTemplate) {
      throw new Error('User, Learning Path, or Certificate Template not found');
    }

    const template = lp.certificateTemplate;
    const config = template.designConfig as any;
    const placeholders = config.placeholders || [];

    const studentName = `${user.firstName} ${user.lastName}`;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
          <img class="background" src="file://${path.join(process.cwd(), 'public', template.backgroundImageUrl || '')}" />

    `;

    for (const p of placeholders) {
      let value = '';
      if (p.key === '{{StudentName}}') value = studentName;
      if (p.key === '{{CourseName}}') value = lp.title; // Learning Path name for Macro-Credentials
      if (p.key === '{{Date}}') value = date;

      const safeLeft = cleanCssValue(p.x, /^[0-9]+(?:\.[0-9]+)?$/, '0');
      const safeTop = cleanCssValue(p.y, /^[0-9]+(?:\.[0-9]+)?$/, '0');
      const safeFontSize = cleanCssValue(p.fontSize, /^[0-9]+(?:\.[0-9]+)?$/, '12');
      const safeColor = cleanCssValue(p.color, /^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|[a-zA-Z]{3,20})$/, '#000000');
      const safeFontFamily = cleanCssValue(p.fontFamily, /^[a-zA-Z0-9\s\-',]+$/, 'sans-serif');
      const safeFontWeight = cleanCssValue(p.fontWeight, /^[a-zA-Z0-9]+$/, 'normal');

      html += `
        <div class="placeholder" style="left: ${safeLeft}px; top: ${safeTop}px; font-size: ${safeFontSize}px; color: ${safeColor}; font-family: ${safeFontFamily}; font-weight: ${safeFontWeight};">
          ${escapeHtml(value)}
        </div>
      `;
    }

    html += `</body></html>`;

    const browser = await puppeteer.launch({ 
      headless: true
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const fileName = `lp-cert-${userId}-${learningPathId}-${Date.now()}.pdf`;
    const outputPath = path.join('uploads/generated-pdfs', fileName);
    
    // Ensure dir exists
    if (!fs.existsSync('uploads/generated-pdfs')) {
      fs.mkdirSync('uploads/generated-pdfs', { recursive: true });
    }

    await page.pdf({
      path: outputPath,
      width: '1123px',
      height: '794px',
      printBackground: true
    });

    await browser.close();

    return prisma.learningPathCertificate.upsert({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId
        }
      },
      update: {
        certificateUrl: `/uploads/generated-pdfs/${fileName}`,
        issuedAt: new Date()
      },
      create: {
        userId,
        learningPathId,
        certificateUrl: `/uploads/generated-pdfs/${fileName}`,
        issuedAt: new Date()
      }
    });
  }
}


