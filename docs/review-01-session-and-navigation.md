# Review 01: Session, permissions, groups and course entry

Date: 2026-10-25. Source review only. No application code changed and no remote requests executed for this review.

## Existing request contract

- Normal API requests use credentials: omit, Client-Id from configuration, and authorization: Bearer <dydBearer cookie>.
- Missing access cookie triggers POST to AUTH_URL/api/refresh with credentials: include, followed by reading the cookie again.
- A first API 401 triggers refresh and one retry.
- Logout navigates to AUTH_URL/api/logout with continue set to the current page URL.
- JSON writes serialize through JSON.stringify; image POST uses FormData field image; PUT upload helpers accept BodyInit; downloads use blobs.
- Query strings commonly use qs.stringify. Preserve its array and optional-field encoding, exact path casing, and zero-based page parameters.

Evidence: LMSAdmin/src/domain/_shared.ts; src/domain/auth.ts; LMSAuth/src/domain/cookie.ts; components/pages/Login and redirectToDefault.ts.

## Current workflow contracts

| Workflow | Existing request/behavior | Replacement requirement |
|---|---|---|
| User profile | Identity GET /api/account/userinfo; supports roles or role arrays | Same endpoint and role interpretation; explicit loading/error state |
| Group listing | Learning GET /api/myAdminGroups with page, resultsPerPage, search, isAdmin=true | Preserve serialization and zero-based page index |
| Single group shortcut | resultsCount===1 navigates directly to its courses tab, including search results | Explicitly decide whether to keep this UX; API unchanged |
| Group list page size | 7 when create card visible, otherwise 8; create flag and Admin status affect visibility | Treat as layout behavior, not API requirement; document deliberate page-size differences |
| Group detail | Learning GET /api/groups/{groupId} | Same request and ID handling |
| Group store | Conditionally loaded when MARKETPLACE_ENABLED; useLoadAdminGroup | Preserve conditional dependency; avoid blocking unrelated screens on optional data |
| Group feature access | useLoadCurrentPlan; subscription disabled => enabled; Admin => enabled | Preserve returned feature-code interpretation; distinguish flags from permissions |
| Group courses | GET /api/groups/{groupId}/courses with search, categoryId, language, page, resultsPerPage, type, status | Preserve exact qs array serialization and optional values |
| Administration courses | GET /api/myAdminCourses with page, resultsPerPage, search; list page size 12 | Keep distinct access/list workflow from group courses |
| Course overview | GET /api/courses/{courseId}; /api/courses/{courseId}/lessons; categories, participants, keys and plan queries can also run | Separate primary content from optional panel loading without changing endpoints |
| Course preview/profile | MAIN_URL points to a separate learner frontend | Preserve explicit external navigation and do not imply these pages are local |

## Permission interpretation

Profile Admin is derived from roles/role containing Admin. Sidebar user/system/referral visibility uses this boolean and environment flags. Group tabs additionally depend on subscription features. adminRoutes registers many routes based on flags; it is not a complete route-level permission guard. NavigationCtxContainer records IDs and location; it does not itself enforce authorization.

The backend's enforcement cannot be proven from this frontend. Do not conclude that visible routes grant permission. Build an action-level capability matrix from UI checks and API documentation/authorized response evidence; do not probe destructive operations to discover access.

## Findings and planned frontend handling

1. High: auth.ts debounce creates promises with resolve only; if the async refresh rejects inside setTimeout, the queued callers never settle. Replace in the new frontend with a shared in-flight refresh promise that resolves or rejects for every caller. Preserve refresh endpoint, method and cookie credentials.
2. Medium: APIPostRefreshToken does not check response.ok. HTTP failures can be treated as completed refreshes. The shared response handler returns a raw Response for a final 401 while claiming the requested data type. Explicitly represent session expiry and stop rendering failed responses as domain data.
3. Medium: useAdminUser imports data from jquery and reads locale from that symbol instead of adminProfile. The effect therefore does not apply the fetched user's locale as intended. Use profile locale with configured fallback.
4. Medium: SidebarNavMenu memoizes menu generation with an empty dependency list although role data loads asynchronously. An initial missing role can leave Admin menu items absent after profile load; language changes also remain stale. Derive the menu from current capabilities and translations.
5. High: course/lesson cache keys exclude courseId. Use resource IDs and all request inputs in new query keys.
6. Medium: course loading discards query errors; initial failure can remain on the spinner. Handle errors before missing-data loading checks.
7. Medium: CourseManagementPage ignores routed tabId; group tabs only initialize local state, and tab clicks do not update URL. Use URL-backed selected tabs and test refresh/back/forward.
8. Review concern: BaseAppLayoutLoadData checks !data, but combined data is an array even while individual queries have no results. Explicit per-query pending states are needed. Avoid duplicating query data into page state solely to render it.

These are code-based findings, not runtime reproductions. Do not copy these defects as compatibility requirements.

## Acceptance scenarios for the new foundation

- Valid access cookie: normal request uses the same URL and headers.
- Missing/expired cookie: concurrent requests share one refresh operation and all settle.
- Refresh network error/HTTP failure: session error is shown; requests do not hang.
- API retry still returns 401: redirect/session-expired flow preserves intended destination.
- User role/profile arrives after initial render: menu and language update correctly.
- Unknown, forbidden and disabled-feature routes have distinct intentional behavior.
- Two courses visited consecutively never share course/lesson cache entries.
- Direct lessons/participants links, reload and browser back select the correct tab.
- Filter and pagination request expressions match existing contracts.
- Optional keys/plan/store failures do not erase primary overview content unnecessarily.

Use fixtures and mocked network responses for automated verification; no remote data changes are needed.
