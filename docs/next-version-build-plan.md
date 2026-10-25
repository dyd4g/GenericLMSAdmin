# Next admin frontend: staged build plan

Status: proposal based on the initial source map and foundation review. No replacement application has been scaffolded. API/backend changes and GitHub modifications are outside scope.

## Working boundaries

- LMSAdmin is the reference implementation; preserve it during planning.
- GenericLMSAdmin holds documentation now and the future frontend later.
- Keep LMSAuth as the sign-in provider. Rewriting authentication is a separate decision.
- Preserve API contracts, payloads, query encoding, credentials and upload protocols. Improve frontend routing, state, presentation and errors.
- Use local fixtures for failures, roles and mutation demonstrations. Remote writes require specific authorization.

## Proposed architecture

Keep React, TypeScript and TanStack Query already familiar in the codebase. Initially keep Next.js to reduce migration variables; settle exact versions only when implementation begins. Replace the custom router with explicit framework routes. Use MUI/Emotion as the initial shared UI foundation, reducing Bootstrap/global Sass/jQuery dependencies as features migrate. No need to add a new global state library by default.

Proposed responsibility boundaries:

```text
src/
  pages/             explicit route entry points (initial Next.js Pages Router proposal)
  features/
    groups/ courses/ lessons/ participants/ books/ certifications/ users/ referrals/ alerts/
      api/           feature request functions preserving existing contracts
      components/    feature-specific views and forms
      hooks/         query/mutation behavior
      types/         request/response models
  shared/
    api/             bearer headers, response handling, refresh coordination
    auth/            session state and capability interpretation
    config/          validated endpoints, brands and flags
    ui/              table, pagination, form fields, dialogs and feedback
    layout/          header, sidebar and breadcrumbs
    i18n/            translations and locale handling
```

This is a design proposal, not an instruction to migrate every existing service immediately. An adapter can retain existing service functions while new screens are built. Add runtime schemas only where they materially protect an API boundary; avoid inventing new backend assumptions.

## Milestones

| Stage | Deliverable | Exit criteria |
|---|---|---|
| A: finish understanding | Per-feature workflow/API/permission/state documents | Every checklist item classified; unknowns visible; no assumed parity |
| B: agree UX and contracts | Navigation, layout, first-screen designs and request fixtures | Existing behavior versus intentional UX changes documented |
| C: foundation | Local app shell, settings, API adapter, session, routing and shared feedback | Session failure/concurrency, permission display, direct-link checks pass |
| D: read-only first slice | Groups -> course list -> course overview | Same request contracts; correct filters, pagination, caching, errors and tab URLs |
| E: course authoring | Course forms, lessons and task editors by type | Payload parity, validation, status restrictions and upload flow checks |
| F: participation | Trainees, coaches, prerequisites, progress and exports | Candidate/assignment/selection behavior and data refresh verified |
| G: remaining administration | Books, keys, certifications, users, referrals and alerts | Feature checklist and flag/role matrix completed |
| H: comparison and cleanup | Full workflow comparison, responsive/accessibility checks | All agreed parity items pass; exceptions documented before retiring old UI |

## How each feature is delivered

1. Read the current UI, caller, service and model together.
2. Record request URL/method/query/body/headers and relevant response shapes with synthetic fixtures.
3. Document actions, defaults, validations, permissions, lifecycle states and feature flags.
4. Agree on screen behavior and intentional changes.
5. Implement the feature locally using the existing API adapter.
6. Verify normal, empty, loading, failed, forbidden and expired-session paths; test meaningful regression cases.
7. Compare with the reference, explain the decisions, and update the feature checklist.

## Decisions to resolve before scaffolding

- Supported brands and languages: all current environments or RSTI first with configurable branding?
- Which existing workflows are required in the first usable release?
- Which URLs must remain exact, and whether outdated URLs need compatibility redirects?
- Desired visual direction after reviewing the first screens.

These choices do not block the remaining source review. No delivery dates are estimated until the deep editor/workflow review establishes effort.

## Next review batch

Read all group/course form definitions and helpers; trace lifecycle actions and mutations without executing them. Produce a field-by-field contract and state/permission matrix. Continue through task editors before marking understanding complete.
