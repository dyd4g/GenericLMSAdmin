# Content editor and outline ordering

Changes only in GenericLMSAdmin. Existing repositories, API implementation and authentication were not changed. User explicitly authorized data creation, updates and deletion in the connected RSTI database.

Implemented:
- Rich text Content editor with traineeBody/coachBody, paragraph/headings, bold/italic/underline, lists, links and undo/redo. Existing HTML and pasted HTML are sanitized before display/editing.
- Drag handles for lessons and tasks within their current lesson; pointer, touch and keyboard sensors. Cross-lesson task moves are not supported because an existing reassignment contract has not been established.
- Save outline order explicitly persists order via existing lesson/task PUT endpoints; Reset order keeps local drafts.
- Lesson and Content-task create/update Save actions use existing POST/PUT routes and payload field names. Other task types are still read/draft-only for content editing.
- Content and ordering are saved separately. Failures are reported; multi-request reorder operations are not transactional and partial updates can be retried.
- No delete UI added in this step. Existing backend authorization remains authoritative.

Verification: JSX parsing passed. Mocked request checks verified content payload fields, booleans, HTML, order and Client-Id/bearer/JSON transport without network writes. Browser verified a newly created local Content draft opens both rich text editors, accepts text, and moves above the existing xAPI task by dragging its handle. The temporary verification draft was discarded and original order restored without saving. Remote create/update persistence has not been exercised by the agent.

Notes: local drafts are memory-only and clear when leaving this workspace. Reorder is available within a lesson, not between lessons. Advanced rich-media controls, existing course-state/feature permission parity and deletion UI require follow-up before broad use.
