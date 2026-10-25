# Assignment task editor

Changes only in GenericLMSAdmin/mui-preview. Existing repositories, APIs and authentication unchanged.

## Behavior (matches the old admin)
- Fields: name, description, enabled, required, assignment instructions (trainee body), coach instructions (shown only on Coach-assisted courses), minimum score, maximum file size, maximum number of files and allowed file types. "Assigned to" is hidden for Assignments, as in the old admin; the payload never carries it.
- Minimum score is entered as 70 to 100 (%) and sent as a 0.7 to 1 ratio. Defaults for a new assignment follow the old admin: 70%, 4 MB, 1 file, no type restriction.
- Maximum file size is entered in MB (1 to 100) and sent as that number. The API echoes what it is sent, so the unit is a client convention; the old admin labels it MB with a default of 4, and this app does the same. Maximum files is 1 to 10 and allowed types is a comma-separated list; spaces, dots and capitals are cleaned (" .PDF, docx " is stored as pdf,docx) and an empty list means any type. The old admin did not expose the file count or types; they are included here because the API requires them and they would otherwise be fixed at defaults.
- API: POST /api/lessons/{id}/assignments (no type field), PUT /api/assignments/{id}, GET /api/assignments/{id}, DELETE /api/assignments/{id}, POST /api/assignments?assignmentId={id} for copy. These are the same calls as the old admin's services. The old admin's own create and edit screens never wire up assignment creation, so its update path is the only reference.

## Server rule found
- A Self-paced course rejects new Assignments with HTTP 409 "Cannot add task to courses of this type." Nothing was created by that attempt. The Add task dialog no longer offers Assignment on Self-paced courses (checked in the browser on course 1); it is still offered on Coach-assisted and Class courses. Class courses were not tested, so the server may reject it there too.

## Verification
- verify-assignment.cjs (no network): payload shape, no assignedTo or type field, extension cleanup, and every range check. All earlier suites still pass.
- Live, approved test on RSTI course 2 ("Leading with Robustness", Coach-assisted, Draft), lesson 4, which started empty:
  - Probe by API created an assignment (size 4, count 1, score 0.7) and read it back unchanged.
  - Edit in the new UI loaded the saved values; changing score to 80, size to 10, count to 3 and types to " .PDF, docx " saved as 0.8, 10, 3 and pdf,docx.
  - New assignment created in the UI saved with the defaults (0.7, 4, 1, no types) at order 2.
  - Copy created an identical task (new ID 11, same settings, same name).
  - All three were deleted with the Delete button; lesson 4 is empty again and course 1 still has its original three tasks and seven form questions.

## Not covered
- Trainee-side submission and file upload, and coach grading, are separate applications.
- Course 1 (Self-paced) cannot hold assignments, so the Assignment editor can only be exercised on a Coach-assisted or Class course.
- Reordering with assignments uses the existing outline ordering, which sends assignedTo with each task's order update; the server accepted a new assignment without it, but an order-only save of an assignment was not run.
