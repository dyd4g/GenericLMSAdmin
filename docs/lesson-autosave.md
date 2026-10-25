# Lesson and Content autosave

Lesson details and Content tasks save 1.2 seconds after typing pauses, including creation. Outline order saves after drag and drop. Existing API contracts and authentication remain unchanged.

Requests are serialized, retaining the latest pending edit per item. Failed saves show an error and Retry. Blank names remain local. Navigation warns while changes are pending. Delete, copy and course status remain explicit actions.

Other task editors and question builders retain their Save controls in this first rollout.

Verification: node verify-autosave.cjs passes checks for coalescing, serialized writes, edits during saving, failure/retry, cancellation, remount recovery and JSX syntax. Tests do not write API data. Live authenticated persistence still needs verification in Galilee Test.

## Quiet autosave update

Routine saving/saved/pending labels and the course-level finish-saving banner are removed. Failure messages and Retry remain visible. Back, course-tab, sidebar navigation and sign-out requested during pending course edits are deferred until edits have saved. The browser close/refresh warning remains for unsaved work. Editors with explicit Save still need that action before deferred navigation completes. API requests and payloads are unchanged.

The autosave verification now also renders the status component to confirm normal states render nothing and errors retain an accessible alert and Retry.
