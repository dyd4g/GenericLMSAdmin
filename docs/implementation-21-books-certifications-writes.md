# Implementation 21: Book and certification writes

Adds writes to implementation-20. Bodies and paths are the old admin's. Writes go through `writeApi`.

## Books (books service)
| Action | Request |
|---|---|
| Create | `POST /Groups/{g}/Books` `{name,author,language,description,body,productId}` |
| Edit | `PUT /Groups/{g}/Books/{id}` same body; an existing `productId` is kept |
| Archive | `PUT /Groups/{g}/Books/{id}/status` body `"Archived"` (the old admin only offers Archive, on Published books) |
| Delete | `DELETE /Groups/{g}/Books/{id}` |

The old form also posts `wasReviewed`, `storeName` and `productUrl`; those belong to revision and store listings, which are not built, so they are not sent.

## Certifications (learning service)
| Action | Request |
|---|---|
| Create | `POST /api/certifications?groupId={g}` `{name,language,description,certificateMessage,isGroupMembershipRequired,isEnrollmentApprovalRequired,privacyLevel}` |
| Edit | `PUT /api/certifications/{id}` |
| Publish / Archive | `PUT /api/certifications/{id}/status` body `"Published"` / `"Archived"` |
| Delete | `DELETE /api/certifications/{id}` |
| Course candidates | `GET /api/certifications/{id}/courseCandidates?search&page&resultsPerPage` |
| Add course | `POST /api/certifications/{id}/courses` body `<courseId>` |
| Remove course | `DELETE /api/certifications/{id}/courses/{courseId}` |
| Reorder | `PUT /api/certifications/{id}/courses/{courseId}` `{order}` (new position, 1-based) |

Rules: title required, max 80; description and certificate message max 500; privacy Public or Unlisted. Publishing needs at least one course and every course Published (same as the old admin); the app says so instead of sending. Reordering uses up/down buttons (the old admin drags).

## Write rules
Books are a global service: writable only where the whole environment is editable (blocked on Galilee Prod, with a "Book changes are not available" message). Certifications are group-scoped like courses.

## Verification
- `verify-library-writes.cjs`: every request, validation, routing, Prod blocking. All suites pass.
- Browser (no writes): New book and New certification buttons and the book form render; Save is disabled until a title is entered.
- Live on Galilee Test, group Test Organization (3002), with the user's approval, all cleaned up (the group is back to no books and no certifications):
  - Book: create, edit (author, description), delete. All worked.
  - Certification (id 152): create, edit, add two existing courses, move one up (order saved), remove both, delete. All worked. Publish was refused in the app because a course was Draft, and nothing was sent.
  - Not tested live: book Archive and certification Publish/Archive (they need a Published item).
- The two existing courses used for the test were only linked and unlinked; they were not changed.

## Not built
Book cover and file upload, revision status, store listings, license key generate/activate; certification duplicate and participant approval.
