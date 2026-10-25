# Users: add and remove on every tab

Changes only in GenericLMSAdmin/mui-preview. Each tab on the user page now lets an admin add and remove what the old admin lets them. All of these are about the user, not a group, so they are allowed only where the whole environment is editable (RSTI dev, Galilee Test); Galilee Prod refuses them all.

| Tab | Add (button, search, tick several) | Per-row actions |
|---|---|---|
| Groups | "Add to groups": `POST /api/Users/{id}/groups` (body: group ID); the list is the groups this admin manages (`myAdminGroups`) | **Make admin / Make member**: `PUT /api/groups/{groupId}/members/{id}/role` (body "Admin" or "Member"); **Remove**: `DELETE /api/Users/{id}/groups/{groupId}` |
| Courses | "Enroll in courses": `POST /api/Users/{id}/traineeCourses`; candidates `traineeCourseCandidates` | **Unenroll**: `DELETE .../traineeCourses/{courseId}`; on coach-assisted courses **Assign coach** (choose from `courses/{id}/coaches`, `POST /api/courses/{courseId}/trainees/{id}/coach`) or **Remove coach** (`DELETE .../coach/{coachId}`) |
| Coaching | none (as in the old admin, coaches are assigned per trainee) | none |
| Administered courses | "Make administrator of courses": `POST /api/Users/{id}/adminCourses`; candidates `adminCourseCandidates` | **Remove**: `DELETE .../adminCourses/{courseId}` |
| Books | "Assign books": `POST {books}/Users/{id}/books/{bookId}`; candidates `bookCandidates` | **Remove**: `DELETE {books}/Users/{id}/books/{bookId}` |
| Certifications | "Enroll in certifications": `POST /api/Users/{id}/traineeCertifications` (body: certification ID); candidates `traineeCertificationCandidates` | **Unenroll**: `DELETE .../traineeCertifications/{id}` |
| Roles | pick a role and Add role (already built) | remove a role chip (already built) |

- Candidate lists use the old admin's query (search, page 0, 100 per page); groups use `search` and `isAdmin=true`.
- Adding several at once sends one request per item, so one failure does not stop the rest; failures are listed.
- Every removal and role change asks for confirmation. After a change the tab reloads.
- `writeApi` now also accepts the books service and a `userLevel` flag for learning-service calls about a user.
- Left out: downloading a completed course's certificate, the per-course completion page, and referrals.

## Verification (no writes)
- `verify-user-assets.cjs`: candidate URLs equal the old `qs` output, every request path, method and body, books and learning routing, and that Galilee Prod refuses all ten kinds of change even with an RSTI-group course open. All 10 suites pass.
- Galilee Test, Admin DYD: every tab shows its Add button (Coaching shows a note), the row actions appear (Courses: Assign coach / Remove coach / Unenroll; Books: Remove), and each Add dialog loads real candidates (39 groups, 97 courses, 17 books, 3 certifications; nothing left to add for administered courses). Nothing was added or removed.
