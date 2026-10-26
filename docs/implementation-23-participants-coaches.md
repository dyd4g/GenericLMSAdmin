# Implementation 23: Participants and coaches

Date: 2026-10-26. New tabs in a course: **Participants** (all courses) and **Coaches** (coach-assisted courses). Code: `mui-preview/CourseParticipants.jsx`, `CourseCoaches.jsx`, `PeoplePicker.jsx`, `useApi.js`, `lib/participants.js`, `lib/download.js`. Tests: `verify-participants.cjs`.

## What it does
**Participants**
- List with search, sort (enrollment date or name), enrollment date range, progress filter (not started, in progress, completed), "Waiting for approval", and for coach-assisted courses "Waiting for a coach" and a coach filter. Pages of 10, 25 or 50.
- Per row: progress bar and state, coaches, enrolled date, last visit, **Approve**, **Progress** (lessons and tasks of that participant, with **Mark as completed**), and a menu with **Download certificate** (completed participants, courses with certificates), **Download transcript**, **Remove from course**.
- **Add participants**: search the people who can still join, tick several, one request each, failures listed and kept ticked.
- **Approve all waiting on this page**, **Assign coach** and **Unassign coach** for the ticked rows (coach-assisted).
- **Download responses (CSV)** for the whole course (system administrators only, as in the old admin).

**Coaches**: list with participant counts, add coaches (candidate search), remove a coach (only when no participants are assigned), per-coach responses CSV (system administrators only).

## Requests (same as the old admin)
| Action | Request |
|---|---|
| List | `GET /api/courses/{id}/trainees?search&sortBy&enrollmentDateStart&enrollmentDateEnd&coachId[]&traineeStatus[]&enrollmentStatus[]&coachPending&page&resultsPerPage` |
| Coaches | `GET /api/courses/{id}/coaches` |
| Candidates | `GET /api/courses/{id}/traineeCandidates?search`, `GET /api/courses/{id}/coachCandidates?search` |
| Progress | `GET /api/courses/{id}/trainees/{userId}/lessons` |
| Approve | `POST /api/courses/{id}/trainees/{userId}/approve` |
| Enroll | `POST /api/Users/{userId}/traineeCourses` body `courseId` |
| Remove participant | `DELETE /api/Users/{userId}/traineeCourses/{courseId}` |
| Add / remove coach | `POST /api/courses/{id}/coaches` body `userId` / `DELETE /api/courses/{id}/coaches/{coachId}` |
| Assign / unassign coach | `POST /api/courses/{id}/trainees/{userId}/coach` body `coachId` / `DELETE .../coach/{coachId}` |
| Mark task complete | `POST /api/trainees/{userId}/task/{taskId}/finish` |
| Files | `GET /api/trainee/{userId}/courses/{id}/certificate`, `GET /api/Users/{userId}/transcript`, `GET /api/courses/{id}/formResponses?coachId` |

## Rules
- All changes count as changes to people (`userLevel`), so they work only where the whole environment is editable (Galilee Test, RSTI dev) and are **blocked on Galilee Prod**, even in the RSTI group. Reading and downloading work everywhere the account has access.
- Draft courses: no adding of participants or coaches. Archived courses: read-only, downloads still work.
- Unknown filter, sort, date and page-size values are dropped before a request is built; ids must be positive whole numbers.
- Batches (add, approve, assign) send one request per person and report who failed; nothing is retried automatically.
- The API remains the authority on who may do what; its message is shown when it refuses.

## Not built
Coach qualifying (prerequisite) courses tab, course and coach license keys, the old admin's separate "add trainee" page (replaced by the picker), and a live check of the writes (see the verification section below once done).

## Verification (2026-10-26, Galilee Test, signed in as the Admin DYD account)
**Read-only:** the participant list, the progress filter (6 down to 2), the progress view with lessons and tasks, the row menu (certificate disabled for a participant who has not finished), the Coaches tab, and a self-paced course (no coach column, no Coaches tab) all loaded real data with no console errors. Certificate, transcript and responses downloads were not run (they save personal files).

**Found and fixed:** the candidate search answers HTTP 400 to an empty search, so the Add picker asks nothing until something is typed. The participant table keeps a minimum width and scrolls sideways on a narrow window. Plural wording in the pickers and the coach list.

**Live writes, with approval, on Test Coach Course 1 (everything undone at the end):**
1. Enroll Austin Teng: worked. He appeared as "Not started", enrolled 10/26/2026, no coach.
2. Add Judd Huang as a coach: **not possible, he already coaches this course** (the picker lists only people not yet in the course). Adding and removing a coach was therefore **not exercised live**; only its requests are covered by the mocked tests.
3. Assign Judd Huang to Austin Teng: worked ("Assigned Judd Huang for 1 participant", shown in the row; the coach count went from 1 to 2).
4. Unassign him: worked; only Austin Teng was affected, the existing participant (Judd DYD) still has the coach.
5. Remove Austin Teng from the course: worked after confirmation. The course is back to one participant and one coach (Judd Huang, 1 participant).

**Not tested live:** approve (nobody was waiting), mark task completed (cannot be undone), add and remove a coach, and the three downloads.
