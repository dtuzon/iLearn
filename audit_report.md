# Course Versioning & Lifecycle Engine — Audit Report
**Auditor:** Principal Enterprise Software Auditor (AI)  
**Scope:** `courses.service.ts`, `courses.controller.ts`, `courses.router.ts`, `CourseManagement.tsx`, `CourseBuilder.tsx`, `schema.prisma`

---

## 🔴 CRITICAL FLAWS

### CRIT-01 — `createDraftVersion`: New draft `isLatest: false` violates Rule 1 integrity on first restore
**File:** `courses.service.ts` L188  
**Rule Violated:** Rule 1, Rule 2  

When a new draft is created via `createDraftVersion`, it is set to `isLatest: false`. This is intentional — the live version should remain `isLatest: true`. **However**, when this draft is eventually **published**, `publishCourse()` archives siblings by matching `status: { in: [PUBLISHED, RETIRED] }`. This means a **PENDING_APPROVAL** sibling with `isLatest: false` could coexist indefinitely without being cleaned up — a lineage can theoretically have one `isLatest: true` (Published v1) + one `isLatest: false` (Pending v2), which is correct, but if v2 is **rejected back to DRAFT** and a v3 draft is created, there are now two DRAFTs in the lineage with `isLatest: false`. The `publishCourse` archival query **only targets PUBLISHED or RETIRED status**, so **it will NOT archive a DRAFT sibling**. This means when v3 publishes, the abandoned v2 DRAFT remains as a ghost record — it won't appear in the main table (filtered by `isLatest`), but it will pollute `getVersions()`.

**Fix:** When a new `createDraftVersion` is called, any existing DRAFT siblings in the same lineage should be soft-archived or flagged. At minimum, the `publishCourse` archive step should also clean up DRAFT and PENDING_APPROVAL siblings.

---

### CRIT-02 — `unretire()` ignores `isLatest` state — breaks Rule 1
**File:** `courses.service.ts` L380-385  
**Rule Violated:** Rule 1, Rule 4  

The `unretire()` method simply does `update({ status: DRAFT })`. It does **not** check whether there is already another course in the lineage with `isLatest: true`. If v1 was RETIRED (isLatest: true) and an admin unretires it, it now has `status: DRAFT` AND `isLatest: true`. This would make it re-appear in the "Active Courses" main table, which is correct **only if** no other version is currently live. But if somehow v2 was PUBLISHED and v1 was **also** marked `isLatest: true` (from the RETIRED state), there will be two records with `isLatest: true` in the same lineage, violating Rule 1.

**Fix:** `unretire()` must check that no sibling has `isLatest: true` before restoring. If a live sibling exists, the unretired course should be brought back as `isLatest: false`, with a clear status flag (e.g., a recovered DRAFT note).

---

### CRIT-03 — `handleRetire` in UI calls `updateStatus(courseId, 'RETIRED')` — no RBAC guard on retirement
**File:** `CourseManagement.tsx` L182 / `courses.router.ts` L73-79  
**Rule Violated:** Rule 9 (spirit)  

The `/api/courses/:id/status` PATCH route authorizes `COURSE_CREATOR`, `LEARNING_MANAGER`, and `ADMINISTRATOR`. This means a **Course Creator** can retire their own published course by calling `PATCH /courses/:id/status` with `{ status: "RETIRED" }` — bypassing any managerial check. There is no separate route for retirement that enforces a higher-privilege guard.

**Fix:** Either add a dedicated `PATCH /:id/retire` endpoint restricted to `LEARNING_MANAGER` and `ADMINISTRATOR`, or add explicit role-checking inside `updateStatus()` for the RETIRED transition, similar to the PUBLISHED check.

---

### CRIT-04 — `restoreVersion` does NOT update `isLatest` after creating the new draft
**File:** `courses.service.ts` L322-378  
**Rule Violated:** Rule 1  

`restoreVersion()` creates a new DRAFT clone with `isLatest: false`. This is correct temporarily, but there is **no mechanism in the UI or backend** that subsequently sets this restored draft to `isLatest: true` after it publishes. It relies entirely on `publishCourse()`, which **does** set `isLatest: true` on publish. This part is okay.

**However**, the more immediate problem: the restored clone has `isLatest: false` permanently until published. If the user navigates to "Active Courses", the restored draft will NOT appear in the table (because it queries `isLatest: true`). The user is redirected to the builder immediately after restoration, so this is masked — but if they navigate away and come back, they **cannot find their restored draft from the main table** unless they know to look in Version History and restore again.

**Fix:** When a new version is restored/cloned as a draft, it should be set to `isLatest: true`, and the previous `isLatest: true` PUBLISHED version should remain as is (published, `isLatest: true`). The query for "Active Courses" must then be updated to handle **both** the published version and its in-progress draft (same lineage can show both if one is DRAFT and one is PUBLISHED). **Or**, use a different query strategy — show `isLatest: true` OR `(status: DRAFT AND parentId is not null)`.

---

### CRIT-05 — `"Course Config"` button in the header does nothing
**File:** `CourseBuilder.tsx` L535-537  
**Rule Violated:** Rule 10 (placeholder)  

```tsx
<Button variant="outline" size="sm" className="h-10 px-4">
  <Settings className="mr-2 h-4 w-4" /> Course Config
</Button>
```

This button has **no `onClick` handler**. It is completely non-functional dead UI. It should either scroll to the "Course Config" tab or be removed.

---

## 🟡 LOGIC INCONSISTENCIES

### LOGIC-01 — Retiring a `PENDING_APPROVAL` course leaves it orphaned
**File:** `CourseManagement.tsx` L552-558, `courses.service.ts` L142-150  
**Rule Violated:** Rule 8 (spirit)  

The UI allows retiring a course with `status !== 'RETIRED'`, which includes `PENDING_APPROVAL`. If a manager retires a course that is pending, it moves to `RETIRED` with `isLatest: true`. This means:
- The course disappears from "Active Courses" (correct)
- The course appears in "Retired Inventory" (correct)
- **But:** Any pending approval notifications/workflow for that course still exists without resolution. The retirement should trigger a formal rejection of the pending approval first.

---

### LOGIC-02 — `getVersions()` returns ALL statuses including DRAFT ghost records
**File:** `courses.service.ts` L273-288  

As described in CRIT-01, orphaned DRAFT records from abandoned versioning attempts will appear in the Version History modal, showing up as stale DRAFTs. Users will see confusing entries like "v2 DRAFT" and "v3 DRAFT" when the intent was to only show a clean audit trail of meaningful versions (Published, Archived).

**Fix:** Filter `getVersions()` to exclude orphaned DRAFTs (e.g., only return records with status in `[PUBLISHED, ARCHIVED, RETIRED]` + the single current DRAFT if `isLatest: true`).

---

### LOGIC-03 — `createDraftVersion` is callable on any course status, including DRAFT itself
**File:** `courses.service.ts` L153, `courses.router.ts` L89-95  

There is no status guard on `createDraftVersion`. A caller could pass a DRAFT course ID and create a "draft of a draft," incrementing the version counter unnecessarily and producing confusing lineage. 

**Fix:** Add a guard: `if (original.status !== CourseStatus.PUBLISHED) throw new Error('Can only version a Published course.')`.

---

### LOGIC-04 — The `Employee` role query has a redundant `OR` condition
**File:** `courses.service.ts` L10-26  

```ts
where: {
  isLatest: true,
  status: CourseStatus.PUBLISHED,  // Already set at top level
  OR: [
    { status: CourseStatus.PUBLISHED },  // REDUNDANT — already filtered above
    { enrollments: { some: { userId } } }
  ]
}
```

The top-level `status: CourseStatus.PUBLISHED` combined with `OR: [{ status: PUBLISHED }, ...]` is logically broken. The OR makes the `status: PUBLISHED` top-level condition a no-op because Prisma evaluates this as `status = PUBLISHED AND (status = PUBLISHED OR enrolled)`. The `enrolled` clause effectively is never used since `status = PUBLISHED` is already required. **This means enrolled employees cannot see courses they are enrolled in if those courses are NOT PUBLISHED** (e.g., re-enrollment on a DRAFT).

**Fix:** Remove the top-level `status: PUBLISHED` and rely on the OR clause.

---

### LOGIC-05 — `restoreVersion` is allowed on PUBLISHED versions — should only apply to ARCHIVED
**File:** `courses.service.ts` L290, `CourseManagement.tsx` L659  

The API endpoint has no status validation. The UI only shows "Restore" for `v.status === 'ARCHIVED'` (correct), but the backend API itself accepts any version ID. A raw API call could restore a PUBLISHED version, creating a second active line.

**Fix:** Add a guard in `restoreVersion()`: `if (versionToRestore.status !== CourseStatus.ARCHIVED) throw new Error(...)`.

---

## 🔵 PLACEHOLDERS & UI MISMATCHES

### UI-01 — "Composition" column uses `course.modules?.length` but `modules` is not fetched
**File:** `CourseManagement.tsx` L483, `courses.service.ts` L39/49  

The service fetches `_count: { select: { modules: true } }` which returns `_count.modules` as a number, NOT a `modules[]` array. But the UI accesses `course.modules?.length`. The frontend `Course` interface has `modules?: CourseModule[]` which is an array, so `course.modules` will be **undefined** for management-list responses. This means all rows will show **"0 Components"** regardless of actual module count.

**Fix:** Update the backend to include `modules` array (heavy), OR expose `_count.modules` in the response and update the `Course` interface and UI to use `course._count?.modules` instead of `course.modules?.length`.

---

### UI-02 — "Author" button label is wrong for PUBLISHED courses in the table
**File:** `CourseManagement.tsx` L494-501  

The "Author" button always reads "Author" with a `Settings2` icon for all course statuses. For a PUBLISHED or ARCHIVED course, this is misleading — clicking it opens the read-only Blueprint view, not an authoring session. The button label should be context-aware:
- DRAFT / PENDING_APPROVAL → "Author" ✅
- PUBLISHED / ARCHIVED → "View Blueprint" (with Eye icon)
- RETIRED → "View" or nothing

---

### UI-03 — Version History "Approved By" shows "System" for ARCHIVED courses that were manually approved
**File:** `CourseManagement.tsx` L652  

```tsx
{v.approvedBy ? `${v.approvedBy.firstName}...` : (v.status === 'PUBLISHED' || v.status === 'ARCHIVED' ? 'System' : '---')}
```

ARCHIVED courses were at some point PUBLISHED (manually approved by a user). Their `approvedById` should be set. But if data was created before the `approvedById` field was added to the schema, those records will show "System" instead of the actual approver name. This is a data migration issue, not a code bug, but should be noted.

---

### UI-04 — `CourseBuilder` subtitle always says "Authoring Studio" for read-only courses
**File:** `CourseBuilder.tsx` L525  

```tsx
<span className="text-sm font-medium">Authoring Studio</span>
```

This label is hardcoded and shows for all course statuses including PUBLISHED and ARCHIVED read-only views. It should conditionally read "Blueprint View" when `isReadonly === true`.

---

### UI-05 — `MultiSelect` for Target Departments in the settings tab has no `disabled` prop
**File:** `CourseBuilder.tsx` L770-775  

```tsx
<MultiSelect 
  placeholder="Search and select departments..."
  options={...}
  selected={identityForm.targetDepartments}
  onChange={...}
/>
```

The `MultiSelect` component is **missing** `disabled={isReadonly}`. The `Title`, `Audience`, `Description`, and `Passing Grade` fields all correctly pass `disabled={isReadonly}`, but the department multi-select does not. An admin can select/deselect departments on a PUBLISHED course from the settings tab.

---

## 🟢 CLEAR

### CLEAR-01 — Deep Clone ID Safety (Rule 5 & Rule 6) ✅
Both `createDraftVersion()` and `restoreVersion()` use Prisma nested `create` operations with **no `id` field specified**, so Prisma auto-generates new CUIDs for all Course, Module, QuizQuestion, and QuizOption records. Foreign keys (courseId on modules, moduleId on quiz questions) are also correctly set by Prisma's nested create relationship. **No ID leaking is occurring.**

### CLEAR-02 — Evaluation Template Reference Cloning (Rule 7) ✅
Both clone methods correctly copy `evaluationTemplateId` (a reference to the global template) without duplicating the `EvaluationTemplate` record itself. The global template remains untouched.

### CLEAR-03 — Publish RBAC Enforcement (Rule 9) ✅
The controller correctly blocks `COURSE_CREATOR` from publishing: `if (status === 'PUBLISHED' && userRole === Role.COURSE_CREATOR) → 403`. The UI also hides the "Approve & Publish" button from non-managers.

### CLEAR-04 — Read-Only Enforcement in CourseBuilder (Rule 11) ✅
`isReadonly` is correctly computed as `course.status === 'PUBLISHED' || ARCHIVED || RETIRED`. It is correctly applied to: DndContext (drag disabled), SortableContext (`disabled={isReadonly}`), Add Module sidebar (`!isReadonly`), form inputs (`disabled={isReadonly}`), Save button (`!isReadonly`), 180-Day Switch (`disabled={isReadonly}`), and Passing Grade input (`disabled={isReadonly}`).

### CLEAR-05 — Retirement Tab Filtering (Rules 3 & 4) ✅
`getAll()` correctly branches: `isRetired ? { isLatest: true, status: RETIRED } : { isLatest: true, status: { not: RETIRED } }`. This cleanly separates the two inventory views.

### CLEAR-06 — Atomic Publish Transaction (Rule 2) ✅
`publishCourse()` correctly uses `$transaction` to atomically: (1) archive all previously PUBLISHED/RETIRED siblings, and (2) set the new version to `PUBLISHED, isLatest: true`.

### CLEAR-07 — Version History Gating (UI) ✅
The "Version History" menu item correctly gates on `course.version > 1`, preventing v1-only courses from showing an empty history dialog.

---

## Summary Priority Matrix

| ID | Severity | Area | Fix Complexity |
|---|---|---|---|
| CRIT-01 | 🔴 Critical | Ghost DRAFT records in lineage | Medium |
| CRIT-02 | 🔴 Critical | `unretire()` breaks isLatest Rule 1 | Low |
| CRIT-03 | 🔴 Critical | Course Creator can retire published courses | Low |
| CRIT-04 | 🔴 Critical | Restored drafts invisible in Active table | Medium |
| CRIT-05 | 🔴 Critical | Non-functional "Course Config" button | Trivial |
| LOGIC-01 | 🟡 Medium | Retiring a PENDING course | Low |
| LOGIC-02 | 🟡 Medium | Ghost DRAFTs in getVersions() | Low |
| LOGIC-03 | 🟡 Medium | Drafting a DRAFT (no status guard) | Trivial |
| LOGIC-04 | 🟡 Medium | Employee OR query broken | Low |
| LOGIC-05 | 🟡 Medium | restoreVersion has no status guard | Trivial |
| UI-01 | 🔵 High | "0 Components" always shown | Low |
| UI-02 | 🔵 Low | "Author" button mislabeled for live courses | Trivial |
| UI-03 | 🔵 Low | "System" for old approved records | Data migration |
| UI-04 | 🔵 Low | "Authoring Studio" shown in read-only | Trivial |
| UI-05 | 🔵 Medium | MultiSelect not disabled in readonly | Trivial |
