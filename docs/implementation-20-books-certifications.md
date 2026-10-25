# Implementation 20: Books and Certifications (read-only first pass)

Scope agreed with the user: lists and detail pages only, no writes. Calls are the old admin's (`as-admin.ts`); the old code was only read.

## Books (books service, per group)
- Pick a group (the groups the admin manages), then search, filter by status (Draft / Published / Archived) and language. 10 per page.
- Detail: Overview (language, group, publish and revision status, store, product ID, file link, store listings, description, details), Readers, Keys.

| What | Request |
|---|---|
| List | `GET {books}/Groups/{g}/Books?search&page&resultsPerPage&language[i]&publishStatus[i]` |
| One | `GET {books}/Groups/{g}/Books/{id}` |
| Readers | `GET {books}/Groups/{g}/Books/{id}/readers` |
| Keys | `GET {licenses}/groups/{g}/books/{id}/licenses?search&resultsPerPage&page` |

New `licenses` base per environment: RSTI `https://api.rsti-dev.dyd.solutions/licenses`, Galilee Test `https://api.licenses-dev.dyd.solutions`, Galilee Prod `https://api.licenses.dyd.solutions`.

## Certifications (learning service)
- Pick a group, search, 10 per page. Detail: Overview (status, publish date, privacy, participant count, group-membership and approval rules, description, certificate message), Courses, Participants.

| What | Request |
|---|---|
| List | `GET /api/groups/{g}/certifications?search&page&resultsPerPage` |
| One (with courses) | `GET /api/certifications/{id}` |
| Participants | `GET /api/certifications/{id}/trainees?page&resultsPerPage` |

HTML (descriptions, certificate message) is sanitized with DOMPurify before display.

## Not built yet (old admin has them)
Create, edit, delete, status changes and duplicate for books and certifications; book cover and file upload, revision status, store locations; license key generate and activate/deactivate; certification course add, remove and reorder; approving participants.

## Verification
- `verify-library.cjs`: every address, compared with `qs` for the query strings, plus bad-id rejection and per-environment bases.
- Live, read-only on Galilee Test: Glory Press books (list, overview, readers, keys) and Tests – Josh certifications (list, overview, courses, participants). No writes sent.
- The book list does not return a language, so that column shows a dash there; the detail page shows it.
