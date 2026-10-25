# Course create/delete and the Video task

Changes only in GenericLMSAdmin/mui-preview. Two libraries were added to the new app only: `tus-js-client` 4.3.1 and `@azure/storage-blob` (the old admin uses the same ones).

## Add and remove a course
- New course (group course list, only where writing is allowed): `POST /api/groups/{groupId}/courses` with the fields the old admin sends (name, description, optional rich introduction, type Self-paced or Coach-assisted, language, visibility, category, code, author, group-membership and approval switches, licence, sequential order, two notification switches, certificate and its message). The course is created as a Draft and opens. No image, SEO or sales settings. The language list follows the environment (RSTI dev: English; Prod: English, Spanish, Portuguese, two Chinese); the category picker shows on RSTI dev only.
- Delete (course page and a trash icon in the list): `DELETE /api/courses/{id}`, Draft and Test courses only, with a confirmation. The app refuses other statuses.
- Prod: writes carry the group they target. Create is allowed only for group 1003, delete only inside an open course of group 1003; an explicit group never falls back to the open course.
- Verified by `verify-courses.cjs` (payload, request paths, status limit, Prod isolation). Not yet run live against a server.

## Video task
- Settings: name, description, enabled, required, assigned to (trainee or coach), skip forward (`POST /api/lessons/{id}/videos`, `PUT /api/videos/{id}`).
- File: `PUT /api/videos/{id}/upload` (file name and size) returns an upload URL and a provider; the browser uploads straight to Vimeo (tus) or Azure Blob; `POST /api/videos/{id}/upload/finish`; `DELETE /api/videos/{id}/upload` removes it. Progress bar, cancel (aborts and removes the partial upload), replace and remove. Disabled while the course is read-only, there are unsaved edits, or the task is not saved yet.
- Verified by `verify-video.cjs` (payload, requests, provider routing, block sizes, Prod isolation).

## Live check on Galilee Prod (RSTI group, course "test" ID 3661), approved
- Sample provided: task 9835 "Draft Video Task", Vimeo, 917 KB, finished. The new editor shows its settings, file, "Uploaded" badge, date, provider and link. Left untouched.
- Created task 9836 "ZZ TEMP Video" (server reported provider Vimeo, no file). Uploaded HPLIFE_certificate02.mp4 (1,070,309 bytes) from a temporary single-file local server; the server recorded the file name, size, start and finish times and a Vimeo link, and the editor showed Uploaded. Remove video cleared the file and link on the server and showed the empty state. The task was deleted; the RSTI group again had exactly the two original courses with their original tasks.
- Not exercised live: cancel mid-upload, replace, the Azure provider, and course create/delete (RSTI dev sign-in had expired).

## Notes
- `npm audit` reports issues in Next, DOMPurify, PostCSS and sharp. They were already in the app, not from the two new libraries.
