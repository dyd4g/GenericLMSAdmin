# Lesson/task copy and delete

Implemented only in GenericLMSAdmin. Existing APIs, repositories and authentication unchanged.

Selected-item header actions:
- Delete persisted lesson: DELETE /api/lessons/{id}; confirmation warns about its tasks.
- Delete persisted task: existing per-type DELETE resource (contents, meetings, forms, assignments, videos, tests, xApiActivities).
- Delete unsaved draft: local removal only, including child draft cleanup for a local lesson.
- Copy lesson: POST /api/lessons?lessonId={id}, no body, matching original postDuplicateLesson.
- Copy Assignment task: POST /api/assignments?assignmentId={id}, no body, matching original postDuplicateAssignment.
- Copy Content/xAPI/Meeting: read existing task details and POST the existing creation payload to the lesson-specific resource; append (copy) to name and place at the end.
- Other individual task copy buttons are disabled with guidance to copy the whole lesson, avoiding incomplete nested questions/test configuration or missing video uploads. This is a current limitation, not complete task-copy parity.

Actions disabled in read-only course modes, during requests, or when persisted mutations would discard dirty edits/order. Confirmation dialogs name the target, show errors, and prevent repeated submits while in flight. After a successful mutation the dialog closes before reloading; refresh failure offers a reload rather than repeating the mutation.

Verification: JSX parsing and mocked request-contract checks passed for all delete paths, no-body clone operations, Content body/order preservation and unsupported-copy guard. Browser showed live Draft course with enabled lesson actions and the copy confirmation. No destructive request or copy operation was executed by the agent against RSTI during verification.
