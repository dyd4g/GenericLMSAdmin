# Implementation 25: License keys

Date: 2026-10-26. Code: `mui-preview/KeyManager.jsx`, `lib/keys.js`; wired into the course view (new **Keys** tab for every course and **Coach keys** tab for coach-assisted courses, in `LiveCourses.jsx`) and the book view (the old read-only list in `LiveLibrary.jsx` is replaced). Tests: `verify-keys.cjs`.

## What it does
- **List** of keys with search, status (active, inactive), activation limit (one or multiple), activations left (some, all used), sort (generated at, last activation at) and pages of 10, 25 or 50. Each key is shown in groups of four characters with a copy button, activations used out of the limit, status, generated and last activation dates, and for course keys of a coach-assisted course the coaches assigned.
- **Generate keys**: how many (1 to 100 at a time) and, for "multiple activation", how many times one key can be activated (1 to 1000; single activation otherwise).
- **Select keys**: **Export as CSV** (cells that a spreadsheet would read as a formula get a leading quote), **Deactivate** (confirmation; the key's own activation limit is sent back, because the service resets it to 0 otherwise), and for course keys of coach-assisted courses **Assign coach** and **Unassign coach**.
- Not in the old admin either: reactivating a key, deleting a key, and "Redeemed by" (a link that did nothing).

## Requests (same as the old admin; licenses service)
| Action | Request |
|---|---|
| List | `GET /groups/{g}/courses/{c}/traineeLicenses` or `.../coachLicenses` or `/groups/{g}/books/{b}/licenses` with `?search&resultsPerPage&page&isActive&multipleActivations&activationsRemaining&sortBy` |
| Generate | `POST .../generate` `{count, maxActivationCount}` |
| Deactivate | `PUT .../{keyId}` `{maxActivationCount, isActive: false}` |
| Assign coach | `POST .../traineeLicenses/{keyId}/coaches` body `coachId` |
| Unassign coach | `DELETE .../traineeLicenses/{keyId}/coaches/{coachId}` |

## Rules
- Changes go to the licenses service and are blocked on Galilee Prod ("License key changes are not available in Galilee Prod"); reading works wherever the account has access. Keys are credentials: they are shown to administrators who can open the course or book, as in the old admin, and are never written into docs or tests.
- Unknown filter, sort and page-size values are dropped; ids must be positive whole numbers; book ids may only contain letters, numbers, dashes and underscores.
- The service decides who may do what; its message is shown.

## Verification
- `node run-tests.cjs` passes, including `verify-keys.cjs` (addresses, query order, payloads, formula-safe export, Prod blocking; no real requests).
- Read-only on Galilee Test: course keys, coach keys and book keys lists, filters and pagination.
- Live write check on Galilee Test, Test Coach Course 1, each step confirmed by the service and by the refreshed list:
  1. Generated 1 course key (single activation): one Active key, 0/1.
  2. Assigned Judd Huang as coach on that key: the Coach column showed his name.
  3. Unassigned him: the Coach column was empty again.
  4. Deactivated the key: Inactive, activation limit kept at 0/1.
  5. Generated 1 coach key on the Coach keys tab: one Active key, 0/1.
  6. Deactivated it: Inactive, 0/1.
- Keys cannot be deleted, so two inactive, unused keys remain on that course. No people or real keys changed.
- Not tested live: book key writes, multiple-activation keys, more than one key at a time.
