# Draft/Test course mode

Changes only in GenericLMSAdmin. Course header offers Switch to Draft to edit for Test courses and Switch to Test for Draft courses. Existing contract is preserved: PUT /api/courses/{id}/draft or /test with the JSON string body "" and existing bearer/Client-Id headers.

Only Draft enables the lesson/task editor, creation buttons, save actions and sortable handles. Read-only guards exist both in UI and mutation handlers. Published/Archived courses are read-only and receive no new transition controls. Dirty lesson/order changes or active saves block status switching; confirmation occurs before each request. Successful transition refetches course detail and rebuilds the editor with the returned mode. Backend authorization remains authoritative.

The existing English translation warns that course progress will be lost on switching back to Draft. That warning is preserved. Browser checks verified the confirmation and cancelled it; the course was not transitioned during verification. Test mode displayed disabled name/description/switch controls, creation/save buttons and reorder handles. Mock request checks verified draft/test paths, method and exact empty-string payload. No API or authentication changes.
