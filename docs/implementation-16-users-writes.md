# Users: writes (create, edit, password, roles, delete)

Changes only in GenericLMSAdmin/mui-preview. Users live in the identity service, so writes use `writeApi(..., { service: 'identity' })`.

## What was added
- **New user** (list): `POST /api/users` with the old admin's fields (full name required and max 80, email, phone required and max 15, gender, country, language, time zone, email and phone confirmed) and `isNewsletterEnabled: false`. Opens the new user's page.
- **Edit** (user page): `PUT /api/users/{id}` with the stored user merged with the edited fields, without the newsletter flag, as the old admin does. Includes **Resend confirmation email** (`POST /api/users/{id}/sendconfirmemailmessage`, body is the user ID) when the email is not confirmed.
- **Change password**: `PUT /api/users/{id}/password`, body is the password as a string. Same rule as the old admin (8 to 20 characters with upper case, lower case, a digit and a symbol) and a confirmation field. The password is only sent in that request.
- **Roles** tab: lists roles from `GET /api/roles`; add `POST /api/Users/{id}/roles` (body is the role ID); remove `DELETE /api/users/{id}/roles/{roleId}`. You cannot remove your own Admin role from here.
- **Delete / Anonymize**: `DELETE /api/users/{id}?keepAnalytics=false` removes the user and their analytics; Anonymize uses `keepAnalytics=true` and keeps analytics. Both ask for confirmation, and neither can be used on the account you are signed in with.
- **Where writes are allowed**: only environments that are fully editable (RSTI dev, Galilee Test). Users are not tied to a group, so Galilee Prod refuses every user change, even inside the RSTI group. The buttons are hidden there.
- `lib/user-lists.js` is generated from the old admin's defaults (348 time zones, 250 countries, genders, language names).

## Verification
- `verify-user-writes.cjs`: validation rules, exact request bodies and paths (including trimming, the merged update, the plain-string password and `keepAnalytics`), routing to the identity service, and that Prod refuses all user writes. All 9 suites pass.
- Live, approved test on Galilee Test (7,127 users before and after), one throwaway user "ZZ TEMP User" (ID 10501, zz-temp-user-20261025@example.com, an example.com address that delivers nothing):
  - Create: stored as sent, except the server marked email and phone as confirmed although they were sent as not confirmed. The total became 7,128.
  - Edit: preferred name changed to "ZZ Edited" and email confirmed turned off; other fields and roles were unchanged.
  - Password: a random 14-character password was generated and typed by the app, accepted by the server, and never displayed or stored.
  - Roles: PlatformMetricsViewer added, read back, removed, read back.
  - Resend confirmation email: failed with HTTP 404. The same path is the only one in the old admin, and a GET on it also returns 404 (not 405), so the route does not exist on this server. No email was sent. The app now says so plainly.
  - Delete: the user was removed (GET returns 404), the total returned to 7,127, no leftover test users, and the signed-in account was untouched.
- Not exercised live: Anonymize, creating users with a gender selected, and the Prod block in the browser (covered by tests).
