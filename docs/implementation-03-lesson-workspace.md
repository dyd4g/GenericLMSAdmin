# Lesson workspace design review

Implemented in GenericLMSAdmin/mui-preview only. Existing repositories and API services were not modified.

Two-panel MUI layout: expandable live course outline and selected lesson/task editor. Lesson count, task count, names and task details come from existing RSTI GET endpoints. Task selection dispatches to the existing per-type resource paths: contents, meetings, forms (form/quiz/survey), assignments, videos, tests, xApiActivities. No new API routes were introduced.

Local draft interactions: lesson/task name and description, enabled/required flags, assignment, xAPI URL and SCORM setting; add lesson/add task dialogs. New items are only created by user action and marked local draft. Drafts stay in memory within the workspace and are lost when it is left. Discard requires confirmation. Save is explicitly disabled. Refresh is disabled with drafts; browser unload warns. No persistence or remote mutation is implemented. Reorder/duplicate/delete and advanced task editors remain future work after existing permission/lifecycle behavior is fully mapped.

Verified in browser: real Level 1 lesson and Enchaining Lifecycle Reliability task; task detail request returned live description and xAPI URL. Add lesson dialog starts empty, requires a name and cancels without inserting data. No sample data was seeded and no write API requests were issued.

Next: review this layout, then map field validation, permissions and course status restrictions before connecting existing create/update contracts. Existing APIs, payload formats and authentication must remain unchanged.
