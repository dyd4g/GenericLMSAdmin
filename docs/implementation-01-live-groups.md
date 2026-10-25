# Implementation 01: live Groups retrieval

Implemented only in GenericLMSAdmin/mui-preview. Existing application repositories were read, not edited.

- The default view now retrieves RSTI groups using GET /learning/api/myAdminGroups with page, resultsPerPage, search and isAdmin=true.
- Uses the existing dydBearer localhost cookie, Client-Id: 1 and credentials: omit. No token values are copied or stored.
- Reads /identity/api/account/userinfo for account name and existing Admin role interpretation.
- No authentication implementation was modified. Missing/expired sessions offer the existing portal login with a return destination; automatic refresh integration is deferred.
- Adds search, zero-based pagination, loading, empty, failure/retry and group details.
- Group details use list response data; there is an explicit link to the existing admin for courses. No sample course records are substituted for real group data.
- Live environment is fixed to RSTI for this first slice. Switching is disabled until per-environment session compatibility is established. The separate sample preview still has label-only environment selection.
- No create, update, delete, password, refresh, role assignment or membership mutation requests are issued.

Verification: JSX parse checks and local HTTP 200 passed. Browser displayed the real RSTI Globals group and current account name, and a nonmatching search displayed the expected empty state. Multi-page behavior awaits an account/search with enough groups. Other features remain placeholders in live mode.
