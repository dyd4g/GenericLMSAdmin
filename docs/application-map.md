# Existing admin application map

Prepared for the GenericLMSAdmin frontend rewrite, 2026-10-25.

## Scope and evidence

This is a source-based application map, not a completed behavioral or security audit. Routes, tabs, service functions, enums, configuration, and navigation were inspected. Individual form rules, all role combinations, all API responses, and every workflow remain to be verified. The browser context shows a course overview after login; this is not proof of access to all operations.

Constraints: preserve API URLs, methods, headers, query serialization, payloads, token behavior, and backend business rules. Build only locally. No pushes, PRs, deployments, or remote data writes during discovery. Existing frontend calls still target remote RSTI test services.

## Application structure

```text
LMSAuth (separate application)
  Login / authentication cookies / redirect
    -> LMSAdmin
       Next.js catch-all page
         -> HomePageWithAuth -> HomePage
            -> custom URL matcher + navigation context
            -> global administration
               Groups | Users | Courses | Referrals | System alerts
            -> group administration
               Group overview | Courses | Members | Certifications | Books | Attributes
                  -> course management / editing
                     Overview | Lessons | Participants | Coaches | Prerequisites
                     Books | Trainee keys | Coach keys
                  -> book management / editing
                     Overview | Book | Readers | Keys
                  -> certification editing / participants
```

Authentication and external learner pages belong to separate applications. Preview, profile, and course execution links can leave the admin frontend. A menu item being hidden is not evidence that backend authorization is enforced.

## Navigation and feature map

| Area | Existing entry and screens | Capabilities evidenced by components/services | Main source |
|---|---|---|---|
| Entry/session | /, shared header/sidebar, logout, profile/execution links | User profile, role-derived presets, token refresh and logout continuation | src/spaPages/HomePage.tsx; src/domain/auth.ts; src/domain/hooks/useAdminUser.ts; src/layouts/BaseAppLayout.tsx |
| Groups | /groups; /groups/create; /groups/:groupId/admin/:tabId; group edit | List/search groups; create/edit/delete; image; overview; membership; group stores and attributes | src/spaPages/Admin/AllGroupsPage; GroupManagementPage; GroupEditionPage |
| Group courses | Group courses tab; new course; course edit | Listing/filtering, creation/editing, images, duplication, deletion, status/revision, privacy, categories, notifications and enrollment settings | src/spaPages/Admin/CreateNewCoursePage; CourseEditionPage; GroupManagementPage/components/tab1 |
| Course administration | /courses and /groups/:groupId/admincourses/:courseId/:tabId | Separate administration course listing and access-assignment workflows; reuses course management screens | src/spaPages/Admin/AdminCoursesPage; admin-routes.tsx |
| Course overview | /groups/:groupId/admin/courses/:courseId/overview | Metadata, description, edit access, status controls, previews and share link | src/spaPages/Admin/CourseManagementPage/index.tsx |
| Lessons/tasks | Course lessons tab and embedded editors | Lesson create/edit/delete/duplicate/order; task editors and participant lesson panels | src/spaPages/Admin/CourseManagementPage/components/tab1 |
| Participants | Course participants tab; addtrainee | Candidate search/add, approval, removal, filters, sorting, pagination, coach assignment, progress/completion and response/transcript exports | src/spaPages/Admin/CourseManagementPage/components/tab2; CourseAddTraineePage.tsx |
| Coaches/prerequisites | coaches, coachPrerequisite; addcoach, addCourse | Add/remove coaches, assign/unassign trainee coaches; qualifying course candidates and removal | src/spaPages/Admin/CourseManagementPage/components/tab3 and tab4; CourseAddCoachPage.tsx |
| Course books | Course books tab; newbook route in administration-course context | Associated books, candidates, creation/association flows and removal | src/spaPages/Admin/CourseManagementPage/components/tab5; CourseAddBookPage.tsx |
| Keys/licenses | Course keys/coachKeys; book keys | List/filter/paginate keys; create/update; coach allocation/removal; activation-related fields | src/domain/hooks/useKeys.ts; src/components/Key; src/domain/services/as-admin.ts |
| Books | Group books tab; newbook; book management/edit | Create/edit/delete, image/file upload/removal, status/revision, external product locations, readers and licenses | src/spaPages/Admin/CreateNewBookPage; BookManagementPage; BookEditionPage |
| Certifications | Group certification tab; create/edit; participants | Course eligibility/association/order, duplicate/delete, publish/archive, participant approval, user enrollment and certificate download | src/spaPages/Admin/CertificationManagementPage |
| Users | /users; /create-user; /users/:userId; edit and course-completion routes | Search/list, create/edit/delete, password changes, confirmation email, email settings, roles and associated assets | src/spaPages/Admin/UsersManagement |
| User associations | /users/:userId/add/{courses,roles,groups,referrals,certifications,books,admincourses} | Candidate selection and assignment/removal for each asset type; course completion details and task completion actions | src/spaPages/Admin/UsersManagement/UserBelongsTo; UserAccess |
| Referrals | /referrals; create; edit | Referral listing/create/edit; user referrals, partner data/categories and referral attribution | src/spaPages/Admin/ReferralsManagement; src/domain/services/as-admin.ts |
| Alerts | /system/alerts | Load/update system alert messages | src/spaPages/Admin/AlertNotificationMaintenance |
| Public/support | /terms; /privacy; /d/:seconds; not-found/error screens | Legal pages, delayed entry, missing-route and request-error presentation | src/spaPages/HomePage.tsx; src/components/P404; src/components/P50x |

Paths shortened in the last column are relative to src/spaPages/Admin unless otherwise stated. Service evidence does not establish that every action is reachable in every configuration.

## Content model and variants

- Course types declared: CoachAssisted, SelfPaced, Class. Class is declared; complete UI coverage still needs investigation.
- Course/book states: Draft, Test, Published, Archived. Certifications declare Draft, Published, Archived. Exact allowed transitions and edit restrictions require per-screen verification.
- Revision states: NotRevised, RevisionInProgress, ChangesRequested, Revised.
- Task types declared: Content, Meeting, EditableForm, Quiz, Survey, Assignment, Video, Test, XApiActivity.
- Question types: text (single/multiline), date, time, datetime, description, dropdown, checkbox, radio, linear scale, radio grid, checkbox grid.
- Test services include attributes, outcomes, dimensions, grid points, expression normalizers and lookup-table normalizers. These need dedicated editor walkthroughs.
- Uploads include image/file requests and runtime Azure/Vimeo upload URLs. Preserve upload initiation, progress, completion, cancellation and retry behavior.

Source: src/domain/enums.ts; src/domain/models; src/domain/services/as-admin.ts; src/domain/services/*upload*; components/tab1 editors.

## Availability rules

Three separate layers must be recorded for every feature:

1. Environment flags: user management, books, certifications, keys, administration courses, marketplace, subscriptions, attributes, and hide/show settings.
2. Account/group permissions: profile Admin role and group/navigation state. Sidebar checks alone are not an authorization specification; exact action permissions remain open.
3. Subscription features: useLoadCurrentPlan checks returned feature codes; Admin bypasses these checks, and disabling subscriptions causes enableFeature to return true.

Subscription feature codes include membership/admin assignment, free/paid courses, categories, content/meeting/form/audio/video/assignment tasks, completion certificates, enrollment approval, trainee tagging, course notifications, certifications, coach management, coach qualifying courses, group pages and books. An enum entry alone does not establish an implemented feature (for example audio).

RSTI local configuration currently uses English. Other checked-in environments support additional languages and brands. Referrals are hidden in the current local RSTI settings even though routes/code exist. See rsti-feature-settings.md for the full flag snapshot.

## Technical flow to preserve

1. LMSAuth authenticates and writes cookies; redirects to admin with a continuation destination.
2. Catch-all Next.js page loads the client application and translation namespaces.
3. HomePage matches URL segments against adminRoutes; navigation context tracks group/course/user IDs.
4. Pages combine shared layout, feature components, React Query hooks and context state.
5. domain/services functions build existing API paths and payloads.
6. domain/_shared.ts attaches request headers/token behavior and processes responses; auth.ts handles refresh/logout.
7. API results feed models, tables, forms and editors; mutations trigger refresh behavior.

The frontend mixes MUI/Emotion, Bootstrap/Sass, jQuery and rich text editing. These are implementation dependencies to assess; they are not API contracts.

## API boundary

Existing static inventory: 216 request call sites (69 GET, 60 POST, 41 PUT, 46 DELETE), plus logout navigation and SDK-managed uploads. Counts represent code locations, not unique endpoints or verified permissions.

Services: learning, identity, licenses, books, subscriptions, marketplace, analytics, alerts and email marketing (not configured locally). Existing functions and request expressions are listed in the accompanying admin-api-inventory.md.

## Known review findings to carry forward

- Course/lesson query keys omit courseId, allowing cross-course cache reuse.
- Initial request failures can remain behind the course loading screen.
- Course management ignores the routed tabId and defaults to overview.

These are source findings, not a comprehensive defect list. Previously observed social-provider loading failure belongs to LMSAuth and has a local defensive fix.

## Discovery gaps before implementation

- Verify each role's visible actions and backend rejection behavior without destructive probes.
- Inspect every form's required fields, defaults, validation, serialization and unsaved-change behavior.
- Trace every API function to active UI callers; identify unused, duplicate or unreachable code.
- Record exact task/test editor behavior and status-dependent restrictions.
- Confirm exported file formats, pagination conventions, dates/timezones and multilingual fallback.
- Compare brands/environment flags; decide which must be supported in the generic frontend.
- Confirm error, empty, loading, refresh and expired-session behavior for each workflow.

## Next sequence

1. Trace sign-in/session and permissions in detail.
2. Trace groups and the course list/overview, including precise read contracts.
3. Document course editing and each task type.
4. Document participants/coaches, books/licenses, certifications, users/referrals/alerts.
5. Agree on feature parity and design; only then scaffold the replacement frontend.
