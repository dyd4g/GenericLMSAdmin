# Implementation 26: book cover, file, revision and store listings; coach prerequisite courses

## Books (Books > a book)
Two new tabs on a book, built on the existing admin's requests (LMSAdmin `as-admin.ts`, BookEditionPage, BookManagementPage).

| Tab | What it does | Who / when |
|---|---|---|
| Cover and file | Upload or remove the cover image; upload or remove the EPUB file; link to the current file | Cover until the book is archived. File only while the book is a Draft. Needs an environment where books can change (not Galilee Prod). |
| Revision and stores | Mark the book revised / not revised; add and remove store listings (store name and link) | Published books, system administrators only, as in the old admin. |

Requests (books service): `PUT .../Groups/{g}/Books/{b}/cover` and `/file` (a form with one part named `file`), `DELETE` the same, `PUT .../revisionStatus` (`"Revised"` or `"NotRevised"`), `POST .../externalProductLocations` `{storeName, productUrl}`, `DELETE .../externalProductLocations/{id}`.

Rules: the cover must be an image, the book file must be a `.epub`, neither may be empty; store links must start with `http://` or `https://`. No file size limit is set here because the old admin sets none; the service answers if a file is too big and its message is shown. The old "Store listings" table on the book overview moved to the Revision and stores tab.

## Coach prerequisite courses (coach-assisted course > Coach prerequisites)
- Lists the courses a coach must complete first (`coachQualifyingCourses`) with an add and remove, and, read-only, the courses this course qualifies coaches for (`coachQualifiedCourses`). Both come with `GET /api/courses/{id}`.
- Add: pick one or more courses from `GET .../coachQualifyingCourseCandidates?search&page&resultsPerPage` (an empty search works; the course itself is not offered). One `POST .../coachQualifyingCourses` per course with the course id as the body, so one failure does not stop the others.
- Remove: `DELETE .../coachQualifyingCourses/{id}` after a confirmation.
- Changes follow the course's group (like other course edits), so on Galilee Prod only the RSTI group can change. Archived courses are read-only. The old admin shows this tab only when the plan has the `AssignCoachQualifyingCourses` feature; this app shows it for every coach-assisted course and the service decides.

## Verification
- `node run-tests.cjs`: all suites pass, including the new `verify-book-assets.cjs` and `verify-prerequisites.cjs` (rules, addresses, bodies, uploads as a form, Prod blocking; no real requests).
- Read-only on Galilee Test: prerequisites tab and candidate list on Test Coach Course 1; Cover and file and Revision and stores tabs on a published Glory Press book.
- Added after finding the gap during the live check: a **Publish** button on a draft book once it has a file (as in the old admin's upload tab), using `PUT .../status` `"Published"`.

## Live write check (Galilee Test)
Prerequisites, on Test Coach Course 1: added "Coach Course Testing" (it appeared in the list), removed it (list empty again). Nothing left behind.

Books, on a throwaway draft "Zz Test Book" in Test Organization, deleted at the end:
1. Created the draft book.
2. Uploaded a tiny PNG cover: saved, and the cover showed.
3. Uploaded a generated EPUB: saved, and the file link appeared.
4. Removed the cover: default cover again.
5. Published the book (new Publish button).
6. Marked it revised: status Revised.
7. Added a store listing, then removed it.
8. Marked it not revised: status Not revised.
9. Deleted the book: gone from the list.

Not tested live: removing the book file (only possible while a draft; the book was published by then), and the Galilee Prod blocking beyond the unit checks.
