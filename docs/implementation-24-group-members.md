# Implementation 24: Group members, group creation and deletion

Date: 2026-10-26. Code: `mui-preview/GroupMembers.jsx`, `GroupLifecycle.jsx`, `lib/members.js`; wired into `GroupWorkspace.jsx` (new **Members** tab, **Delete group** in Group settings) and `LiveGroups.jsx` (**Create group**). Tests: `verify-members.cjs`.

## What it does
- **Members tab** of a group: search, sort (join date or name), status filter (Approved, Waiting for approval), "Group administrators only", pages of 10, 25 or 50. Each row shows name, email, join date and status (group administrator, approved, waiting).
- **Approve** (one, or all waiting on the page), **Make / Remove group administrator**, **Remove from group** (all with a confirmation). The signed-in person's own row has no actions, as in the old admin.
- **Add members** (system administrators only): search users by name or email, tick several, one request each. The old admin adds members from the user's own page (Groups tab), which still works.
- **Create group** on the Groups list: name (80), description (500) and, for system administrators, the URL code (25 letters, numbers or hyphens). Shown to system administrators, and to an account that has no group yet, as in the old admin. The new group opens afterwards.
- **Delete group** in Group settings: system administrators only, typing the exact group name.

## Requests (same as the old admin)
| Action | Request |
|---|---|
| List | `GET /api/groups/{id}/members?search&sortBy&isAdmin&page&resultsPerPage&membershipStatus[]` |
| Approve | `POST /api/groups/{id}/members/{userId}/approve` |
| Role | `PUT /api/groups/{id}/members/{userId}/role` body `"Admin"` or `"Member"` |
| Remove | `DELETE /api/Users/{userId}/groups/{id}` |
| Add | `POST /api/Users/{userId}/groups` body `groupId` |
| Create | `POST /api/groups` `{name, code, description, body}` (answers with the new id) |
| Delete | `DELETE /api/groups/{id}` |

## Rules
- All of these count as changes to people or to the group's existence, so they work only where the whole environment is editable (Galilee Test, RSTI dev) and are blocked on Galilee Prod, even for the RSTI group.
- The API decides who may do what (group administrator or system administrator) and what can be deleted; its message is shown.
- Unknown filter, sort and page-size values are dropped; ids must be positive whole numbers.
- Not built: the old admin hides the Members tab when the group's subscription plan lacks "manage memberships"; this app does not read plans, so the tab always shows for people who can open the group.

## Verification (2026-10-26, Galilee Test, signed in as the Admin DYD account)
**Read-only:** the Groups list (39 groups, Create group shown to the system administrator), the Members tab of group EBD DYD (4 members, filters, row menus: "Make group administrator", "Remove from group"), and the delete dialog (confirm stays disabled until the exact name is typed; cancelled) loaded real data with no errors. The groups list shows 5 members for EBD DYD but the Members tab lists 4 (the same off-by-one seen on course participant counts).

**Live writes, with approval, all inside a new group that was deleted at the end:**
1. Create group "Codex write test 20261026" (name only): worked; group 3003 opened with 0 members, plan Free.
2. Add Austin Teng (ateng@dyd.com) through Add members: worked; he appeared at once as **Approved** (not waiting), so the approve step was **not needed** and approval was not exercised live.
3. Make group administrator: worked; his status changed to "Group administrator".
4. Remove as group administrator: worked; back to "Approved", still a member.
5. Remove from group: worked; "This group has no members yet."
6. Delete the group (typed the exact name): worked; the list went back to 39 groups and a search for the name found nothing.

**Not tested live:** approving a waiting member (no member was ever waiting), the group-administrator-only filter against a group that has administrators, deleting a group that still has courses or members (the service may refuse it).

**Found and fixed:** the "group created" message stayed on the list after returning from the group; it is now cleared.
