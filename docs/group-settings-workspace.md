# Group settings workspace — Galilee Test

Implemented only in GenericLMSAdmin/mui-preview. Existing LMSAdmin/LMSAuth source, API contracts and database records were not changed during implementation.

Entry: Groups -> View group. Loads GET {learning}/api/groups/{id} rather than relying on the list summary.

Views:
- Overview: current description, sanitized rich introduction, group ID, code, member count, plan and creation date; View courses connects to the existing new-app course list.
- Group settings: name (required, max 80), description (max 500), URL code (max 25, letters/numbers/hyphens, system-admin control), rich introduction. Save uses existing PUT /api/groups/{id} with exactly name/code/description/body; blank code becomes null. A non-system-admin save preserves the stored code.
- Group image: local selection preview, explicit Save image (raw-file PUT /api/groups/{id}/image, matching old updateGroupImage), and confirmed removal (DELETE same path). Image saves are separate from metadata.
- Custom attributes: explanatory unavailable state. Existing Galilee Test, RSTI and Galilee Prod env files have GROUP_ATTRIBUTE_AVAILABLE and MARKETPLACE_ENABLED disabled. No marketplace service is enabled or inferred. Basic group attributes are maintained in Settings.

Permissions: allow editing only if the selected environment permits this explicit group ID and either the signed-in account is Admin or the fetched group grants isAdmin. Backend permissions remain authoritative. No course-level global write scope is used for group changes; requests carry explicit groupId. Original restrictions for Galilee Prod remain intact.

Draft protection: back/course navigation and sidebar navigation ask before discarding unsaved metadata/images; browser unload warns; navigating between group tabs keeps draft fields. Error/success/loading states and explicit retry are provided. No new group creation or group deletion feature was added in this step.

Verification: JSX parsing passed. verify-groups.cjs passed payload field/length checks, non-admin code retention, null URL handling, exact PUT path and raw image request/blocked-group checks with mocked fetch. Browser confirmed the app identifies itself as Galilee Test on http://127.0.0.1:3004 and reaches the existing login link on 3012. A signed-in group settings/save check remains outstanding because that browser session has no active login cookie. No database mutations were executed.
