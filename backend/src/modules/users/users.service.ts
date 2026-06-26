import { prisma } from '../../lib/prisma';
import { hashPassword, validatePasswordComplexity } from '../../utils/password';
import { Role } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { sendWelcomeEmail } from '../../lib/email-service';
import crypto from 'crypto';



export class UsersService {
  static async getAll(userId: string, role: string, filters: { search?: string, role?: Role, departmentId?: string } = {}) {
    const where: any = {};

    if (role === Role.DEPARTMENT_HEAD) {
      const dept = await prisma.department.findUnique({
        where: { headUserId: userId }
      });
      if (!dept) return [];
      where.departmentId = dept.id;
    }

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId === 'none' ? null : filters.departmentId;
    }

    return prisma.user.findMany({
      where,
      include: { 
        department: true,
        immediateSuperior: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async bulkUpdate(userIds: string[], data: { action: string, role?: Role, departmentId?: string }) {
    switch (data.action) {
      case 'DEACTIVATE':
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        });
      case 'ACTIVATE':
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        });
      case 'CHANGE_ROLE':
        if (!data.role) throw new Error('Role is required');
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: data.role }
        });
      case 'CHANGE_DEPARTMENT':
        const deptId = data.departmentId === 'none' ? null : data.departmentId;
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { departmentId: deptId }
        });
      default:
        throw new Error('Invalid bulk action');
    }
  }

  static async create(data: {
    username: string;
    password?: string;
    role: Role;
    departmentId?: string | null;
    firstName?: string;
    lastName?: string;
    middleInitial?: string;
    nickname?: string;
    position?: string;
    dateHire?: Date;
    mobileNumber?: string;
    personalEmail?: string;
    hrisName?: string;
    email?: string;
    immediateSuperiorId?: string | null;
  }) {
    const { password, ...userData } = data;
    
    // Check for duplicate username or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email ? { equals: userData.email, mode: 'insensitive' } : undefined }
        ].filter(Boolean) as any
      }
    });

    if (existingUser) {
      if (existingUser.username === userData.username) {
        throw new Error(`Username "${userData.username}" is already taken.`);
      }
      if (existingUser.email && userData.email && existingUser.email.toLowerCase() === userData.email.toLowerCase()) {
        throw new Error(`Email address "${userData.email}" is already registered.`);
      }
    }

    // Generate a temporary password if not provided (8-character alphanumeric)
    if (password) {
      validatePasswordComplexity(password);
    }
    const tempPassword = password || crypto.randomBytes(4).toString('hex').toUpperCase();
    const passwordHash = await hashPassword(tempPassword);

    if (userData.dateHire && typeof userData.dateHire === 'string') {
      userData.dateHire = new Date(userData.dateHire);
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        requiresPasswordChange: true // Always true for newly created users
      }
    });

    // Send Welcome Email if user has an email address
    if (user.email) {
      // Trigger email asynchronously so it doesn't block the response
      sendWelcomeEmail(
        user.email,
        user.username,
        tempPassword,
        user.firstName || user.username
      ).catch(err => console.error(`Failed to send welcome email to ${user.email}:`, err));
    }

    return user;
  }


  static async update(id: string, data: Partial<{
    username: string;
    password?: string;
    role: Role;
    departmentId: string | null;
    firstName: string;
    lastName: string;
    middleInitial: string;
    nickname: string;
    position: string;
    dateHire: Date;
    mobileNumber: string;
    personalEmail: string;
    hrisName: string;
    email: string;
    isActive: boolean;
    immediateSuperiorId: string | null;
  }>) {
    const updateData: any = { ...data };
    
    if (data.password !== undefined) {
      if (data.password) {
        validatePasswordComplexity(data.password);
        updateData.passwordHash = await hashPassword(data.password);
        updateData.requiresPasswordChange = true;
      }
      delete updateData.password;
    }

    if (updateData.dateHire !== undefined) {
      if (updateData.dateHire) {
        const parsed = new Date(updateData.dateHire);
        if (isNaN(parsed.getTime())) {
          updateData.dateHire = null;
        } else {
          updateData.dateHire = parsed;
        }
      } else {
        updateData.dateHire = null;
      }
    }

    return prisma.user.update({
      where: { id },
      data: updateData
    });
  }


  static async bulkImport(csvBuffer: Buffer) {
    interface ExcelImportRecord {
      'DEPT/DIV/BR/GR'?: string;
      'IMMEDIATE SUPERVISOR'?: string;
      'HRIS NAME'?: string;
      'LAST NAME'?: string;
      'FIRST NAME'?: string;
      'M.I'?: string;
      'NICKNAME'?: string;
      'POSITION'?: string;
      'DATE HIRE'?: string;
      'EMAIL ADDRESS'?: string;
      'Number'?: string;
      'Personal Email'?: string;
    }

    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as ExcelImportRecord[];

    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (const record of records) {
      const keys = Object.keys(record);
      
      // Strict helper to find value by prioritized matching
      const findValue = (patterns: string[]) => {
        const normalizedPatterns = patterns.map(p => p.toUpperCase().replace(/[^A-Z]/g, ''));
        
        // 1. Try exact normalized matches first
        for (const p of normalizedPatterns) {
          const key = keys.find(k => k.toUpperCase().replace(/[^A-Z]/g, '') === p);
          if (key) return (record as any)[key];
        }
        
        // 2. Fallback to inclusion matches
        for (const p of normalizedPatterns) {
          const key = keys.find(k => k.toUpperCase().replace(/[^A-Z]/g, '').includes(p));
          if (key) return (record as any)[key];
        }
        
        return undefined;
      };

      const email = findValue(['EMAILADDRESS', 'COMPANYEMAIL', 'WORKEMAIL']);
      const personalEmail = findValue(['PERSONALEMAIL', 'PRIVATEEMAIL']);

      if (!email) {
        results.errors.push(`Skipping record: Missing EMAIL ADDRESS`);
        continue;
      }

      try {
        // 1. Resolve Department
        let departmentId = null;
        const deptName = findValue(['DEPTDIVBRGR', 'DEPARTMENT', 'DIVISION']);
        if (deptName) {
          const dept = await prisma.department.findFirst({
            where: { name: { equals: deptName.trim(), mode: 'insensitive' } }
          });
          if (dept) {
            departmentId = dept.id;
          } else {
            const newDept = await prisma.department.create({
              data: { name: deptName.trim() }
            });
            departmentId = newDept.id;
          }
        }

        // 2. Resolve Immediate Superior
        let immediateSuperiorId = null;
        const supervisorName = findValue(['IMMEDIATESUPERVISOR', 'SUPERVISOR', 'MANAGER']);
        if (supervisorName && supervisorName.trim() !== 'None') {
          const name = supervisorName.trim();
          const supervisor = await prisma.user.findFirst({
            where: {
              OR: [
                { hrisName: { equals: name, mode: 'insensitive' } },
                {
                  AND: [
                    { firstName: { contains: name.includes(',') ? name.split(',')[1].trim().split(' ')[0] : name.split(' ')[0], mode: 'insensitive' } },
                    { lastName: { contains: name.includes(',') ? name.split(',')[0].trim() : name.split(' ').pop(), mode: 'insensitive' } }
                  ]
                }
              ]
            }
          });
          if (supervisor) immediateSuperiorId = supervisor.id;
        }

        // 3. Prepare Date Hire
        let dateHire = undefined;
        const rawDate = findValue(['DATEHIRE', 'DATEHIRED', 'HIREDATE']);
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateHire = d;
          } else {
            const parts = rawDate.split(/[\/\-]/);
            if (parts.length === 3) {
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              const p2 = parseInt(parts[2]);
              const year = p2 < 100 ? 2000 + p2 : p2;
              if (p0 > 12) {
                dateHire = new Date(year, p1 - 1, p0);
              } else if (p1 > 12) {
                dateHire = new Date(year, p0 - 1, p1);
              } else {
                dateHire = new Date(year, p0 - 1, p1);
              }
            }
          }
        }

        // 4. Create User
        const extractedUsername = email.includes('@') ? email.split('@')[0].trim() : email.trim();
        
        await this.create({
          username: extractedUsername,
          email: email.trim(),
          firstName: findValue(['FIRSTNAME']),
          lastName: findValue(['LASTNAME']),
          middleInitial: findValue(['MI', 'MIDDLEINITIAL']),
          nickname: findValue(['NICKNAME']),
          position: findValue(['POSITION', 'JOBTITLE']),
          dateHire: dateHire && !isNaN(dateHire.getTime()) ? dateHire : undefined,
          mobileNumber: findValue(['NUMBER', 'MOBILENUMBER', 'PHONE', 'CONTACT']),
          personalEmail: personalEmail ? personalEmail.trim() : undefined,
          hrisName: findValue(['HRISNAME']),
          departmentId,
          immediateSuperiorId,
          role: Role.EMPLOYEE
        });

        results.success++;
      } catch (err: any) {
        results.errors.push(`Error importing ${email}: ${err.message}`);
      }
    }

    return results;
  }

  static async getTeam(userId: string) {
    return prisma.user.findMany({
      where: { immediateSuperiorId: userId },
      include: {
        department: true,
        enrollments: {
          include: {
            course: true
          }
        },
        learningPathEnrollments: {
          include: {
            learningPath: true
          }
        }
      }
    });
  }

  static async changePassword(userId: string, newPassword: string) {
    validatePasswordComplexity(newPassword);
    const passwordHash = await hashPassword(newPassword);
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        requiresPasswordChange: false
      }
    });
  }

  static async getProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        immediateSuperior: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    if (!user) throw new Error('User not found');
    const { passwordHash, ...safeUser } = user as any;
    return safeUser;
  }

  static async getProgress(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        immediateSuperior: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            position: true
          }
        }
      }
    });
    if (!user) throw new Error('User not found');
    const { passwordHash, ...safeUser } = user as any;

    const learningPathEnrollments = await prisma.learningPathEnrollment.findMany({
      where: { userId },
      include: {
        learningPath: {
          include: {
            pathCourses: {
              include: {
                course: true
              }
            }
          }
        }
      }
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lecturer: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: { modules: true }
            }
          }
        },
        moduleProgress: true
      }
    });

    const transcripts = await prisma.transcript.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            title: true
          }
        }
      }
    });

    const learningPathCertificates = await prisma.learningPathCertificate.findMany({
      where: { userId },
      include: {
        learningPath: {
          select: {
            title: true
          }
        }
      }
    });

    return {
      user: safeUser,
      learningPathEnrollments,
      enrollments,
      transcripts,
      learningPathCertificates
    };
  }
}


