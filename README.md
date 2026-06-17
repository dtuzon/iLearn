# iLearn LMS | Standard Insurance Co., Inc.

![iLearn Banner](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&h=400&fit=crop)

---

## 1. Project Overview & Branding
**iLearn LMS** is a Tier-1 Learning Experience Platform (LXP) custom-engineered for **Standard Insurance Co., Inc.** It is designed to modernize corporate training through high-fidelity cohort-based learning, automated compliance tracking, and a robust real-time grading infrastructure.

Unlike generic LMS solutions, iLearn prioritizes **strict compliance versioning** and **relational integrity**, ensuring that as corporate policies evolve, learner history remains immutable and auditable.

---

## 2. Tech Stack & Infrastructure
The platform leverages a modern, high-performance stack optimized for reliability, real-time feedback, and developer velocity.

### Frontend
- **Core Framework**: React 19 & Vite 8
- **Styling**: Tailwind CSS v4, custom Vanilla CSS, and Radix UI primitives
- **Component System**: custom shadcn/ui components (Buttons, Cards, Dialogs, Selects, Accordions)
- **Data Visualization**: Recharts (for supervisor analytics & admin dashboards)
- **Report Generation**: `@react-pdf/renderer` (Executive Batch PDF Analytics) & `html2canvas-pro` + `jspdf`
- **Rich-Text Editor**: `react-quill-new` (integrated into custom HTML course content builders)
- **Real-Time Client**: `pusher-js` (WebSockets for real-time grading alerts and notifications)
- **Routing**: React Router DOM v7

### Backend
- **Core Framework**: Node.js (Express 5 with TypeScript 6)
- **Database Access**: Prisma ORM v7 with Native PostgreSQL driver (`pg`)
- **Real-Time Engine**: Pusher Server SDK (triggers events on grading workflows)
- **Email Delivery**: Nodemailer (Google Workspace SMTP configuration)
- **Task Scheduling**: `node-cron` (manages reminder sequences, deadlines, and behavioral triggers)
- **Security & Session**: JSON Web Tokens (`jsonwebtoken`), bcryptjs (password hashing), Helmet (HTTP headers), and CORS policies
- **File Uploads**: Multer (configured with secure target disk storage pipelines)

---

## 3. Data Flow & Entity-Relationship Architecture

The following diagram maps out how core database models connect across the platform:

```mermaid
erDiagram
    User ||--o| Department : "member of"
    Department ||--o| User : "headed by"
    User ||--o| User : "reports to (immediateSuperior)"
    User ||--o| Enrollment : "tracks course progress"
    User ||--o| Transcript : "earns graduation"
    User ||--o| Notification : "receives"
    User ||--o| AuditLog : "triggers history"
    User ||--o| ActivitySubmission : "submits assignments"
    User ||--o| EssaySubmission : "submits essays"
    User ||--o| LearningPathEnrollment : "tracks path progress"
    User ||--o| BehavioralEvaluation : "evaluates (as supervisor/employee)"
    
    Course ||--o| CourseModule : "contains blueprint lessons"
    Course ||--o| Enrollment : "spawns progress tracking"
    Course ||--o| Transcript : "referenced in"
    Course ||--o| CertificateTemplate : "styled by"
    Course ||--o| CourseAttachment : "attaches resource files"
    Course ||--o| Batch : "assigned to"
    
    LearningPath ||--o| LearningPathCourse : "defines course order"
    LearningPath ||--o| LearningPathEnrollment : "tracks path status"
    LearningPath ||--o| LearningPathCertificate : "rewards curriculum"
    LearningPath ||--o| Batch : "assigned to"
    
    Batch ||--o| Enrollment : "groups learner cohorts"
    Batch ||--o| LearningPathEnrollment : "groups pathway cohorts"
    Batch ||--o| BatchCourseSchedule : "customizes path timelines"
    Batch ||--o| BatchChecker : "assigns grading staff"
    Batch ||--o| BatchLiveSession : "links Zoom webcast details"
    
    Enrollment ||--o| ModuleProgress : "contains progress details"
    CourseModule ||--o| ModuleProgress : "tracks completions"
    CourseModule ||--o| QuizQuestion : "defines evaluation choices"
    CourseModule ||--o| ActivitySubmission : "linked submissions"
    
    QuizQuestion ||--o| QuizOption : "has choices"
    QuizQuestion ||--o| EssaySubmission : "tracks written answers"
```

---

## 4. RBAC & Access Control Matrix
The system enforces strict Role-Based Access Control (RBAC) across both API middleware and frontend conditional layouts.

| Role | Target Objective | Key Permissions & Limits |
| :--- | :--- | :--- |
| **ADMINISTRATOR** | Global Control | - Full system override.<br>- System-wide branding config (colors, logo, texts).<br>- Department configuration & user management.<br>- System audit log monitoring & raw database seeding. |
| **LEARNING_MANAGER** | Cohort & Program Administration | - Bulk Enrollment Deployments.<br>- Batch lifecycle administration (Start, Cancel, Archive).<br>- Batch-to-Checker mapping.<br>- Publishing approval over drafts created by Course Creators. |
| **COURSE_CREATOR** | Curriculum Construction | - Authoring Courses, Modules, Quizzes, & Assignments.<br>- Customizing Certificate templates via the visual builder canvas.<br>- Adding course attachments (PDFs, templates).<br>- Grading text/file uploads if designated as Lecturer. |
| **SUPERVISOR** | Operations & Talent Assessment | - Real-time compliance monitoring of direct subordinates.<br>- Grading Activity Submissions routed by the Batch Checker engine.<br>- Performing 180-Day Behavioral Evaluations on subordinates. |
| **DEPARTMENT_HEAD** | Compliance Oversight | - Read-only dashboard for department metrics.<br>- Department-wide analytics, enrollment status, and certificate audits. |
| **EMPLOYEE** | Active Learner | - Browsing courses via the Discovery Catalog.<br>- Progressing through active Courses & Learning Paths.<br>- Taking quizzes, uploading workshop assignments, and joining webcasts.<br>- Viewing and downloading earned certificates. |

---

## 5. Core Architectural Workflows

### 🔄 Content Versioning (Immutable Core)
To ensure compliance records are audit-ready, iLearn implements an Immutable Core versioning system:
1. When a creator edits a published course, the changes are cloned into a `DRAFT` state.
2. Learners actively enrolled in the older version finish on `isLatest: false` records.
3. Newly approved drafts are marked as `isLatest: true`, and new enrollments route there. Historical data remains untouched.

### 👥 Batch & Cohort Grading Pipeline
Batches isolate student groups and delegate grading responsibilities:
- **Batch Checker Routing**: Instead of course lecturers grading everyone, the `BatchChecker` configuration delegates specific cohorts to specific Supervisors or Learning Managers.
- **WebSocket Web Live Grading**: When an employee submits a workshop, Pusher pushes a real-time event to the assigned checker's grading dashboard for instant review.

### 🚀 Bulk Deployment Engine
Administrators can deploy curriculum schedules to high quantities of learners:
- **Targeting Matrix**: Target by individual accounts, job descriptions, or entire departments.
- **Upsert Isolation**: Prisma's `@@unique([userId, courseId])` configuration prevents duplicate course assignments and updates active due dates dynamically.

### 🔒 Strict Sequential Learning Loops
Learners cannot jump forward in courses:
- Progress is strictly bound by `currentModuleOrder`. The backend intercepts player requests, rendering downstream modules locked until the previous step receives a `COMPLETED` flag.

### 🧠 180-Day Behavioral Evaluations
- Measures long-term K.A.S.H. (Knowledge, Attitude, Skills, Habits) retention. 180 days post-completion, the supervisor evaluates changes in employee behavior compared to their pre-course performance.

---

## 6. Subsystem Module Map
The codebase is structured into self-contained modular subsystems.

### Core Modules (`backend/src/modules/`)
1. **auth**: JSON Web Token security, session parsing, and first-login password enforcement.
2. **users**: Comprehensive profile info, HRIS attributes, and supervisor reporting hierarchies.
3. **departments**: Structural mappings and executive reporting dashboards.
4. **courses**: Managing course lifecycles (Draft, Pending Approval, Published, Archived, Retired).
5. **modules**: Custom lesson building blocks (video embeds, rich text, external documents).
6. **quizzes**: Multiple-choice, true/false, essay, and strict or case-insensitive enumeration scoring engines.
7. **activities**: Interactive workshop file uploads and text response submissions.
8. **evaluations**: Course feedback, webcast facilitator scoring, and 180-day behavioral evaluations.
9. **learning-paths**: Linear paths connecting multiple courses into unified curricula.
10. **batches**: Administrative batch groupings, customizable schedules, and checker assignments.
11. **enrollments**: Granular step-by-step progress tracking inside the course player.
12. **certificates**: Coordinate-based image overlay and PDF generator canvas.
13. **calendar**: Interactive calendar plotting deadlines, scheduled batches, and webcast sessions.
14. **announcements**: Notification board banners and administrative posts.
15. **dashboard**: Metrics compilation engines feeding dynamic admin dashboards.
16. **settings**: Custom branding configurations, SMTP inputs, and file upload parameters.
17. **notifications**: Custom alert channels powered by WebSocket triggers.
18. **zoom**: Service layer generating Zoom Webcast meetings on batch generation.
19. **catalog**: Search and filter engine driving course catalog discovery.

---

## 7. Background Worker Cron Engine (`backend/src/workers/`)
The background engine runs scheduled workflows in Node-cron:

- **`batch-notifications.worker.ts`**
  - Triggers email notifications for upcoming cohorts.
  - Warns students **30 days, 7 days, and 3 days** prior to the start of a batch.
- **`deadline-reminders.worker.ts`**
  - Audits course enrollments with target due dates.
  - Sends automatic email reminders at the **7-day, 3-day, and 1-day** marks.
- **`deadline.worker.ts`**
  - Scans active courses for overdue statuses.
  - Switches expired states to `OVERDUE` and sends email notifications to supervisors.
- **`evaluation.worker.ts`**
  - Scans completions daily.
  - Triggers the 180-day post-course evaluation form when the milestone date is reached.

---

## 8. Local Setup & Environment Configuration

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL Instance (configured with a default database)
- Pusher Account (for live alerts and instant grading)

### Environment Settings
Create a `.env` file in the `backend/` folder:

```env
# Database Credentials
DATABASE_URL="postgresql://postgres:password@localhost:5432/ilearn?schema=public"

# JSON Web Token Secret
JWT_SECRET="your-super-secret-security-hash-here"

# WebSockets Configuration
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
PUSHER_CLUSTER="your_pusher_cluster"

# Email Server SMTP Configuration
SMTP_USER="smtp-account-username"
SMTP_PASS="smtp-account-password"

# File Upload Thresholds
MAX_UPLOAD_SIZE_MB=15
```

Create a `.env` file in the `frontend/` folder:

```env
# API Gateway Target
VITE_API_URL="http://localhost:3000/api"

# WebSockets Credentials
VITE_PUSHER_KEY="your_pusher_key"
VITE_PUSHER_CLUSTER="your_pusher_cluster"
```

---

## 9. Launch & Deployment Sequences

### Step 1: Install Dependencies
```bash
# Backend Setup
cd backend
npm install

# Frontend Setup
cd ../frontend
npm install
```

### Step 2: Initialize the Database
Generate the Prisma client types and push the local schema layout onto your PostgreSQL database:
```bash
cd backend
npx prisma generate
npx prisma db push
```

### Step 3: Run the Smart Seeder
iLearn includes a non-destructive seeder that populates system roles, mock courses, system settings, and custom evaluation forms without wiping your database:
```bash
npm run seed
```

### Step 4: Launch the Local Servers
```bash
# Start backend service (Runs on HTTP localhost:3000)
cd backend
npm run dev

# Start frontend application (Runs on HTTP localhost:5173)
cd frontend
npm run dev
```

---
**Standard Insurance Co., Inc.** | *Elevating Professional Excellence through Technology.*
