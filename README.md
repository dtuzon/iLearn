# Elevate LMS | Standard Insurance

![Elevate Banner](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&h=400&fit=crop)

## 1. Project Overview & Branding
**Elevate LMS** is a Tier-1 Learning Experience Platform (LXP) custom-engineered for **Standard Insurance Co., Inc.** It is designed to modernize corporate training through high-fidelity cohort-based learning, automated compliance tracking, and a robust real-time grading infrastructure.

Unlike generic LMS solutions, Elevate prioritizes **strict compliance versioning** and **relational integrity**, ensuring that as corporate policies evolve, learner history remains immutable and auditable.

---

## 2. Tech Stack & Infrastructure
The platform leverages a modern, high-performance stack optimized for reliability and developer velocity.

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15+, React 19, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js (Express) with TypeScript |
| **Database** | PostgreSQL via Prisma ORM |
| **Real-Time** | Pusher (WebSockets) for Live Grading & Notifications |
| **Email** | Google Workspace SMTP (Batch-throttled via Node-Cron) |
| **Styling** | Vanilla CSS + Radix UI primitives |

---

## 3. Core Architectural Workflows

### 🔄 Content Versioning (Workflow B)
To maintain the integrity of historic `ModuleProgress` records, Elevate implements a "Immutable Core" versioning system. When a published course is modified:
1. The current version is cloned into a `DRAFT` state.
2. Relational links to historical completions are preserved on the original `isLatest: false` record.
3. New enrollments are automatically routed to the latest published version, while existing learners can continue their current iteration without data loss.

### 👥 Batch & Cohort Engine
The **Batch Management System** handles mass-scheduling with surgical precision:
- **Strict Access Control**: `BatchCourseSchedule` dynamically restricts module access based on future unlock dates and hard deadlines.
- **Checker Routing**: `BatchChecker` records determine which staff members (Lecturers or Supervisors) have visibility into a specific cohort's activity submissions via the **Live Grading Portal**.

### 🚀 Bulk Deployment Engine
The deployment engine allows administrators to push content to thousands of users simultaneously:
- **Targeting**: Deploy by Department, Job Role, or Individual.
- **Conflict Resolution**: Uses Prisma's `@@unique([userId, courseId])` to safely upsert enrollments, preventing duplicate assignments while updating due dates for existing learners.

---

## 4. Data Mapping & Schema Highlights
Elevate's data architecture is built for enterprise reporting and organizational hierarchy.

- **User & Department**: Users are mapped to a `Department` and an `immediateSuperior` (Supervisor), enabling automated reporting lines.
- **Content Discovery**: `Course` and `LearningPath` entities are enriched with `SkillTag` and `JobPosition` metadata, powering the **Discover** catalog's personalized recommendations.
- **Enrollment Wrapper**: The `Enrollment` model acts as the central hub, linking `User`, `Course`, and `Batch`, while tracking granular `ModuleProgress` and final `Transcript` results.

---

## 5. RBAC & Access Control Matrix
The system enforces a strict Role-Based Access Control (RBAC) model across both the API and UI layers.

| Role | System Authority |
| :--- | :--- |
| **ADMINISTRATOR** | Full global control; bypasses all functional restrictions. |
| **LEARNING_MANAGER** | Content & Cohort lead; manages batches, enrollments, and paths. |
| **COURSE_CREATOR** | Instructional Designer; builds courses and evaluates submissions. |
| **SUPERVISOR** | Line Manager; monitors direct reports and submits evaluations. |
| **DEPARTMENT_HEAD** | Executive visibility; department-wide compliance oversight. |
| **EMPLOYEE** | Primary learner; consumes content and tracks personal growth. |

---

## 6. Local Development & Setup

### Prerequisites
- Node.js 20+
- PostgreSQL instance
- Pusher.com Account (for real-time features)

### Environment Variables
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ilearn"
JWT_SECRET="your-super-secret-key"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="..."
SMTP_USER="..."
SMTP_PASS="..."
```

### Installation & Launch
1. **Clone & Install Dependencies**:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

2. **Database Initialization**:
   ```bash
   cd backend
   npx prisma db push
   ```

3. **Smart Seeding**:
   Elevate uses a **Non-Destructive Smart Seeder** that preserves your existing users and departments while refreshing the demo course catalog.
   ```bash
   npm run seed
   ```

4. **Run Development Servers**:
   ```bash
   # Start Backend (Port 3000)
   cd backend && npm run dev
   
   # Start Frontend (Port 5173)
   cd frontend && npm run dev
   ```

---
**Standard Insurance Co., Inc.** | *Elevating Professional Excellence through Technology.*
