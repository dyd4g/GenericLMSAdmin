# Users (read-only)

Changes only in GenericLMSAdmin/mui-preview. No writes: no create, edit, password, role, assignment or delete.

## What it does
- **Users list** (sidebar Users, shown to Admins): `GET {identity}/api/users` with the old admin's parameters in the same order (search, sortBy, page, resultsPerPage, then filters as `key=value`). Search (300 ms delay), sort by Created date (default, newest first) or Name, filter by Email confirmed / not confirmed and by language, 10 per page. Columns: user (picture, name, preferred name), email with a "Not confirmed" badge, language, created, last login.
- **User detail** (View user): `GET {identity}/api/users/{id}` for the profile (email, phone and confirmation, language, time zone, country, gender, created, last updated, last login, ID, active and email-confirmed chips). Tabs load only when opened and use the old admin's calls:
  - Groups `Users/{id}/groups`; Courses `Users/{id}/traineeCourses`; Coaching `coachCourses`; Administered courses `adminCourses`; Certifications `traineeCertifications`; Books `{books}/Users/{id}/books`; Roles come from the user record.
  - Each environment now also has its books service address.
- The list call does not return roles (only the detail call does), so the list has no Roles column.
- Left out: referrals (hidden on RSTI and Galilee), newsletter and email-marketing settings, HPLife partner fields, and the per-course completion page.

## Verification
- `verify-users.cjs`: the list URL equals the old admin's `qs` output for 5 search/filter cases (including punctuation, `&`, `+`, `=` and Chinese), each detail list URL, and the per-environment identity and books addresses. All 8 suites pass.
- Live, read-only, Galilee Test as Admin DYD: 7,127 users; sorting by name starts at "Abedeel"; unconfirmed 6,977 + confirmed 150 = all; Portuguese filter 567; search finds "Admin DYD" (1 result). The detail page for Admin DYD showed its profile, 7 courses, 5 books, no groups, and the Admin role.
- Not exercised live: the Groups, Coaching, Administered courses and Certifications tabs with data (the field names were read from other users' real responses), and the language filter in the interface.
