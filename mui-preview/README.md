# Generic LMS Admin

Run npm run dev from mui-preview to serve localhost:3003 (loopback only).

Uses real RSTI API responses for groups, group courses, my administration courses, course overview and lessons. No sample-data UI remains in the active app. Search/pagination and group course status/type filters are connected. Other modules are not implemented yet. No remote data mutations are enabled.

Uses the existing authentication cookie; the authentication process remains unchanged. Missing/expired sessions link to the existing portal. Multi-environment switching and automatic session refresh are deferred.
