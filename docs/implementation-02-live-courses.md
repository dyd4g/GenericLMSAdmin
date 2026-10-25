# Implementation 02: API-only courses

Changes restricted to GenericLMSAdmin. Removed the sample-data screens and preview toggle from the active React app. Earlier static design artifacts are retained as historical files but are not served by the current app.

Connected read-only workflows:
- Groups -> group details -> group courses.
- Courses sidebar -> /api/myAdminCourses (distinct from group listing).
- Course overview -> /api/courses/{id}.
- Course lessons -> /api/courses/{id}/lessons.

Group course search, pagination and status/type filters use the existing request contract, including indexed array query parameters. Compared six search/filter combinations against the existing qs serializer, including punctuation and Unicode; all matched. No fallback group IDs or sample records are inserted.

Browser verification: RSTI Globals returned two courses, RTSI Robust Engineering (Self Paced) and Leading with Robustness (Coach Assisted). Opened the first overview and checked returned metadata. Other sidebar modules remain explicit unconnected states. Authentication is unchanged; existing login cookie is read. No mutations are enabled. This is an initial retrieval slice, not complete feature parity.
