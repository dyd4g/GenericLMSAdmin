# Implementation 22: Whole-app test and review

Date: 2026-10-25. Environment: Galilee Test (read-only walkthrough; no writes in this pass).

## What was run
- All 19 `verify-*.cjs` suites.
- A production build (`next build`): compiles, lints and type-checks.
- Browser walkthrough on Galilee Test: Groups (list, group detail), Courses (list, course, lessons, task editor), Users (list, all 8 detail tabs), Books, Certifications, Referrals, System alerts. Console watched for errors.

## Found and fixed
1. **Test suites were failing (9 of 19).** The new sign-in change moved the session token to `sessionStorage`; the older tests only mocked the cookie. Added a `sessionStorage` stub to those tests. `verify-writes.cjs` also had a stale mock (no `canWrite`); fixed. This was a test problem, not an app bug.
2. **"RSTI" hard-coded in user-facing text** (course table label, lesson and question delete and save messages). Now uses the environment name, so Galilee Test no longer says "Saved to RSTI".
3. **Edit could open before the full record loaded** on a book or certification, so saving could have blanked the description or details. Edit is now disabled until the record loads.
4. **Stale footer** ("Existing authentication and API services are unchanged. Lesson details…") on every page. Removed.

## Checked and fine
- Every write goes through `writeApi` (no other POST/PUT/DELETE in the app); the sign-in call is the only other POST.
- All `dangerouslySetInnerHTML` uses are sanitized with DOMPurify.
- No console errors in any section. An old "Illegal invocation" in the autosave queue showed in the console history but did not recur.
- Sign-in route: same-origin check, JSON only, 16 KB body limit, no caching, upstream hosts from config.

## Dependency fix (done)
- `npm audit fix`: Next 15.5.9 -> 15.5.28 (the old version had critical remote-code-execution advisories, fixed in 15.5.24 and 15.5.28), dompurify -> 3.4.17, sharp -> 0.35.5.
- Next still bundled a vulnerable postcss, so `package.json` now has `"overrides": {"postcss": "^8.5.23"}`.
- Result: `npm audit --omit=dev` reports 0 vulnerabilities. React, MUI and the other direct dependencies are unchanged.
- After the upgrade: all 19 suites pass, the production build compiles, and a production build against Galilee Test passed the walkthrough (all sections, a course's lessons, all 8 user tabs, a book).
- **Known problem: the Next dev server (`next dev`) on 15.5.28 shows a blank page after any reload in the in-app browser** (the first load after a start works). Production (`next build` + `next start`) is fine on every reload. Not fixed; downgrading is not an option because of the advisories.
- **Workaround in place:** the `galilee-test-app` launch entry now runs `GenericLMSAdmin/prod/run-test-app-prod.cjs`, which builds and serves a production build (build folder `.next-test-prod`) on port 3004. After changing code, restart that server so it rebuilds. The old dev runner `run-test-app.cjs` is still there. Only files inside GenericLMSAdmin and the `galilee-test-app` entry in `.claude/launch.json` changed; the old admin is untouched.

## Open items (not changed)
- **Group picker shows only the first 100 groups** (Books, Certifications).
- **Access token is kept in `sessionStorage`**, readable by any script on the page. Acceptable here because HTML is sanitized, but worth knowing.
- Not tested live: book Archive, certification Publish/Archive, alert saves, user-tab add/remove, Anonymize, course create/delete (user said they will test course create/delete manually).
- The RSTI dev server (port 3003) was not running, so RSTI was not re-checked.
- Build folders `.next-prod` (73 MB) and `.next-test` are leftovers from Prod and Test runs; `.next-prod` is no longer needed.
- Keyboard drag-ordering and loading existing quiz answer keys were unconfirmed earlier and still are.
- Book cover/file upload, revisions, store listings, license keys, certification participant approval are not built.
