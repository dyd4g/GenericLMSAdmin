# Frontend rewrite feature checklist

Status: initial source inventory complete; detailed contract tracing, runtime verification and replacement implementation remain open. Unchecked items are work to verify/preserve, not claims that the current application lacks them.

For each item: document existing behavior and source, map API method/URL/query/body/headers, record role/flag/status restrictions, verify safe behavior, then implement and compare. Remote mutations are not authorized for discovery.

## Foundations
- [x] Map global routes and group routes.
- [x] Identify configured flags, tab declarations and task/question enums.
- [x] Produce static admin API call-site inventory.
- [ ] Trace login continuation, shared cookies, expiry, refresh and logout.
- [ ] Document global Admin versus group administration access per action.
- [ ] Record sidebar/header/breadcrumb, back/forward, deep-link and invalid-route behavior.
- [ ] Document brand, language, timezone, feature-flag and subscription combinations.
- [ ] Define consistent loading, empty, error, retry and forbidden states.

## Groups
- [ ] Group list: search, sort, pagination, selection and navigation.
- [ ] Create/edit: fields, defaults, validation, images, privacy and links.
- [ ] Delete: confirmation, dependencies, success/error behavior (code inspection only initially).
- [ ] Members: candidate search/add, approval, removal, admin assignment/revocation.
- [ ] Group attributes, values and store-related data.
- [ ] Feature/role-dependent tabs.

## Courses
- [ ] Group course list and administration course list; filters/categories/status/language.
- [ ] Overview metadata, descriptions, breadcrumbs, preview and sharing.
- [ ] Create/edit: every field, validation and payload mapping.
- [ ] Images and removal.
- [ ] Duplicate/delete and revision/status controls.
- [ ] Draft/Test/Published/Archived restrictions and confirmations.
- [ ] SelfPaced/CoachAssisted/Class differences; confirm actual Class support.
- [ ] Enrollment approval, membership requirement, notifications and certificate settings.
- [ ] Product locations, pricing/marketplace-related fields and course attributes where present.

## Lessons and tasks
- [ ] Lessons: create/edit/delete/duplicate/order and refresh behavior.
- [ ] Content: rich text, images/media and persisted markup.
- [ ] Meetings: scheduling, timezone and location/link fields.
- [ ] Editable forms: fields, questions and settings.
- [ ] Quiz and survey: options, expected answers, scoring and display modes.
- [ ] Assignment: create/edit/duplicate/delete and files.
- [ ] Video: initiate upload, provider selection, progress, finish, cancel/removal and retry.
- [ ] Test: attributes, outcomes, dimensions, grid points and score normalizers.
- [ ] xAPI activity: create/edit/upload or configuration paths as implemented.
- [ ] All 12 question types and nested/grid option editing.
- [ ] Draft editor versus participant lesson view; preview as trainee/coach.

## Participants and coaches
- [ ] Candidate search/enrollment and approval.
- [ ] Participant filters, sorting, pagination and selection.
- [ ] Removal, bulk actions and confirmation behavior where implemented.
- [ ] Coach add/remove and trainee assignment/unassignment.
- [ ] Coach qualifying course add/remove.
- [ ] Progress, completion details and marking tasks completed.
- [ ] Transcripts, responses and completion certificate downloads.

## Books and licenses
- [ ] Group book list, overview, creation and editing.
- [ ] Book files/images: upload, replace and remove.
- [ ] Book lifecycle/revision and product locations.
- [ ] Course-book associations and candidate selection.
- [ ] Readers and user book assignments/removal.
- [ ] Course, coach and book keys: listing/filtering/pagination/create/update.
- [ ] Activation fields and coach-key allocation/removal.

## Certifications
- [ ] List/create/edit/duplicate/delete.
- [ ] Eligible courses: association, removal and ordering.
- [ ] Publish/archive and edit restrictions.
- [ ] Participants and approval.
- [ ] User enrollment/removal and certificate downloads.

## Users, referrals and system
- [ ] User list/search/filter/sort/pagination.
- [ ] User creation/editing/deletion and validation.
- [ ] Password change, confirmation email and email settings.
- [ ] Roles: list, assign, remove and permission restrictions.
- [ ] User courses, administration courses, groups, books and certifications.
- [ ] User referrals and partner attribution/categories.
- [ ] Referral list/create/edit and hidden-navigation behavior.
- [ ] Alert message loading/editing and audience/type fields.
- [ ] Terms/privacy and external profile/execution links.

## Completion gates for each rewritten feature
- [ ] Existing API requests preserved (including casing, query encoding and optional fields).
- [ ] Core workflow and applicable roles/flags/statuses covered.
- [ ] Loading/empty/error/unauthorized/expired-session behavior checked.
- [ ] Keyboard access, labels, responsive layout and validation feedback checked.
- [ ] Relevant regression checks pass using fixtures or explicitly authorized service access.
- [ ] Comparison against old implementation completed; differences documented.
- [ ] No GitHub modification and no unintended remote data mutation.
