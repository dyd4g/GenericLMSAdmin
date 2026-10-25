# Galilee Prod (read-only) environment

Changes only in GenericLMSAdmin. LMSAdmin and LMSAuth source files were not edited; their env file was read for the endpoint URLs only.

## What was added
- Environment switch in `mui-preview/lib/read-api.js`: `NEXT_PUBLIC_LMS_ENV` selects `rsti` (default, writable) or `galilee-prod`. An unknown value falls back to RSTI.
- `galilee-prod` uses the endpoints from the old admin's `env/galilee-prod.env`: learning `https://api.learning.dyd.solutions`, identity `https://api.identity.dyd.solutions`, Client-Id 1. The old-admin links are hidden there because no admin URL is configured.
- Read-only by design: `writeApi` refuses every POST, PUT and DELETE before any request is made, the lesson and question editors open read-only, and the Draft/Test switch is hidden. A warning banner and an amber "Galilee Prod" chip are always shown.
- `prod/run-prod-app.cjs` runs the app on http://127.0.0.1:3004 with its own build folder (`.next-prod`, via the new `next.config.js`), beside the RSTI app on 3003.
- `prod/run-prod-auth.cjs` runs a copy of the login portal (`prod/auth-copy`, a source copy of LMSAuth sharing its node_modules through a junction) on http://127.0.0.1:3012. Settings are passed as process environment only: Prod identity API, Client-Id 1, cookie domain 127.0.0.1, insecure cookie allowed for local HTTP, redirect to port 3004. The copy exists so the running LMSAuth on 3002 and its build folder are untouched.
- Sessions are isolated: the Prod cookie is scoped to 127.0.0.1, the RSTI cookie to localhost.
- Launch entries `galilee-prod-auth` and `galilee-prod-app` added to `.claude/launch.json`.

## Verification
- `verify-environments.cjs` (no network): default is RSTI and writable; a typo falls back to RSTI; Galilee Prod has the right endpoints and read URL encoding; POST, PUT and DELETE are all refused and no request is made. All earlier suites pass.
- Browser: http://127.0.0.1:3004 shows the read-only banner and "Connected to Galilee Prod"; the portal on 3012 renders its login page. Sign-in and live Prod reads were not run by the agent.

## Use
1. Start both servers (launch entries above), open http://127.0.0.1:3012/login?continue=http%3A%2F%2F127.0.0.1%3A3004%2F, and sign in with your own Galilee account.
2. You land on http://127.0.0.1:3004 with your Prod groups and courses.

## Caveats
- The copy of the login portal is a snapshot; delete `prod/auth-copy` and recreate it if LMSAuth changes.
- Prod's cookie lifetime and refresh follow the portal; the new app still has no automatic refresh, so an expired session shows the sign-in prompt.
- The RSTI app (port 3003) will restart once because `next.config.js` is new.
- The footer line "saved only when you choose Save" is still shown on Prod although saving is blocked.

## Update: edits allowed only in the RSTI group
Galilee Prod is no longer fully read-only. Writes are allowed only for courses that belong to the RSTI group (ID 1003 on Prod, found by listing the signed-in admin's groups); every other group stays read-only.
- Config: `galilee-prod` now has `readOnly: false`, `writableGroupId: 1003`, `writableGroupName: 'RSTI'` (lib/read-api.js). RSTI dev is unchanged and writable everywhere.
- How it is enforced: the open course view records its group ID (taken from the course's own `group.id`, never from where you navigated from) in `writeScope`, and clears it when the course closes. `writeApi` refuses any write unless that ID equals 1003; with no open course, an unknown group or any other group it fails closed and sends nothing. The course view also locks the editors, hides the Draft/Test switch and shows "This course is read-only: Galilee Prod changes are limited to the RSTI group." for other groups.
- Tests: `verify-environments.cjs` covers fail-closed behavior (no scope, null, other group IDs, look-alike 10030, non-numeric) for POST, PUT and DELETE, and that a write inside group 1003 is sent.
- Checked in the browser as jlin@dyd.com (Admin): the list shows 22 real Prod groups; the RSTI group's only course, "Assessment" (ID 2658, Draft, Coach-assisted), has Add lesson, Add task, Copy, Delete and Switch to Test enabled; a Draft course in EBD DYD ("Banco de fotos") shows the read-only notice with those controls disabled. No data was written during this check.
- Limit: the guard is a client-side safety in this app, not a server permission. The signed-in account can still change any group in the old admin.
- Stale wording: the footer lines "saved only when you choose Save" and "editing and deletion are not enabled" still appear on some screens.

## Live write test on Galilee Prod (approved), RSTI group course "Assessment" (ID 2658)
Before: one lesson "Assessment" (ID 3747) with one Test task (ID 8776), Draft, Coach-assisted, group 1003. That lesson and task were never edited.
- Created through the app: lesson "ZZ TEMP lesson" (4767); inside it Content 9832, Assignment 9833 (defaults 0.7 / 4 MB / 1 file) and Quiz 9834 with one multiple-choice question (37185, weight 1) whose answer key was set to option "Yes" (10578).
- Edited and read back from the server: Quiz key 10578 to 10579; Assignment file count 1 to 2; Content description set to "edited by write test".
- Deleted with the app's Delete buttons, in order Quiz, Assignment, Content, then the lesson; each confirmation dialog named the right item. Final read-back: the course has exactly the original lesson 3747 with Test task 8776, and the course is still Draft in group 1003.
- One stray click (a stale element reference during the Content edit) sent the page back to the Groups screen; it discarded an unsaved edit and sent no request. The edit was redone and verified.
- Not exercised on Prod: Survey, forms, the Draft/Test switch, copy, reordering. Other groups were not written to.

## Switched to Galilee Test (Prod is no longer used)
At your request the Prod pair of servers was stopped and the Prod session on 127.0.0.1 was signed out through the portal's own logout. The Prod environment code and its RSTI-group guard remain in the app but have no launch entries.
- New `galilee-test` environment (lib/read-api.js): learning `https://api.learning-dev.dyd.solutions`, identity `https://api.identity-dev.dyd.solutions`, Client-Id 1, links to `https://admin.galilee-test.dyd.solutions`, English plus Spanish, Portuguese and two Chinese, category picker on. Fully editable, with no group limit (a test environment).
- `prod/run-test-app.cjs` runs the app on http://127.0.0.1:3004 (build folder `.next-test`); `prod/run-test-auth.cjs` runs the login portal copy on http://127.0.0.1:3012 against the Test identity API. Launch entries `galilee-test-auth` and `galilee-test-app` replace the Prod ones.
- Checked: the Test APIs accept requests from this app, the admin site responds, `verify-environments.cjs` covers the new environment, and the Test app loads with "Connected to Galilee Test" and no read-only banner. Sign-in and live reads have not been run yet.
