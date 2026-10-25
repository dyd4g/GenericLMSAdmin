# Built-in administrator sign-in

The new app's /login page signs in using the existing identity /api/token contract (password grant, client_id and Client-Id), through a fixed-destination local Next API handler. No original repository or upstream API was changed. Password recovery continues through the existing portal.

Before mounting the workspace, the server validates the token against /api/account/userinfo. Access requires the exact Admin role, or a nonempty existing assigned-administrator group/course list. Unknown responses, permission errors and unavailable permission checks do not authorize entry. The original API continues to enforce authorization for individual resources and actions.

Access tokens are held in tab-scoped sessionStorage, keyed by the configured identity service, with expiration. Passwords and refresh tokens are not stored. Existing portal cookies can be used initially, but must pass the same access check. Signing out clears this app session and blocks fallback to the portal cookie in that tab; it does not sign the user out of other applications. Rechecks run on focus and every minute; revoked/expired access returns to sign-in. Existing edit guards block sign-out with pending changes.

Verification: node verify-auth.cjs covers login request shape, system/group/course administrators, non-admin denial, malformed permission responses, expired sessions, upstream errors, cross-origin login rejection, sign-out and stored-session expiration. node verify-autosave.cjs continues to pass. The Galilee Test /login screen loaded in the in-app browser. A real credential sign-in remains to be checked by the user; no credentials were fabricated or requested and no records were created for testing.
