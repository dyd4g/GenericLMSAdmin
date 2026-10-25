# Implementation 19: Referrals

Referrals are "partners" in the analytics service. The calls are the old admin's (`ReferralsManagement`, `as-admin.ts`); the old code was only read.

## Screen (admins only)
- Search (debounced), 10 per page, table of name / short name, code, external ID, link with copy button, category.
- QR code per row (`qrcode.react`, new app only) for `<referral URL>/<code>`.
- Add and Edit dialog (where the environment is editable). Name required (max 80), category required (defaults to the first), optional short name, code and external ID. A code cannot contain spaces or `/ ? # %` because it becomes part of the link. Referrals cannot be deleted (same as the old admin).
- User detail has a new **Referrals** tab: list, "Add to referrals" (candidate picker) and Remove.

## Calls (`analytics` service)
| Action | Request |
|---|---|
| List | `GET /partners?search&page&resultsPerPage` |
| Categories | `GET /partners/categories` |
| Create | `POST /partners` `{name,shortName,code,externalId,categoryId}` |
| Update | `PUT /partners/{id}` `{id,categoryName,name,shortName,code,externalId,categoryId}` |
| User's referrals | `GET /partners/byReps/{userId}` |
| Candidates | `GET /partners/byReps/{userId}/candidates?search&page&resultsPerPage` |
| Add rep / remove rep | `POST /partners/{id}/reps` `{userId}` / `DELETE /partners/{id}/reps/{userId}` |

Bases: RSTI `https://api.rsti-dev.dyd.solutions/analytics`, Galilee Test `https://api.analytics-dev.dyd.solutions`, Galilee Prod `https://api.analytics.dyd.solutions`. Link bases: `.../go` on rsti-dev, galilee-test and www.galileeone.com.

## Write rules
`analytics` is a global service like identity, books and alerts: allowed where the whole environment is editable (RSTI dev, Galilee Test), blocked on Galilee Prod.

## Verification
- `verify-referrals.cjs`: addresses per environment, validation, request bodies, user-tab calls, service routing, Prod blocking.
- Two older tests used `referrals` as their "unknown kind" example; they now use `ftp`.
- Live, read-only on Galilee Test: list loads 13 referrals, QR dialog renders, user Referrals tab loads.
- Not tested live: create, edit, add/remove rep (no writes sent).
- `verify-writes.cjs` (not one of the 11 suites) fails with `canWrite is not a function`; it was not touched by this work.
