# System alerts

Changes only in GenericLMSAdmin/mui-preview. Sidebar "System alerts" (Admins).

## What the old admin does, and what this does
- Lists the alerts (`GET {alerts}/alerts`): one per language, each with a type (Success or Error), an HTML message and an active flag. Selecting a row opens its editor; the first row is selected by default.
- Edits one alert (`PUT {alerts}/alerts/{id}`, body `{ type, message, isActive }`). There is no create or delete.
- The old "For mobile app" switch only changed a help text and sent nothing, so it was left out.
- Added: a live preview of the banner (Error is red, Success is green; inactive alerts are shown faded and marked as not shown to anyone), a warning when an active alert has no message, and "Edit as HTML". The visual editor keeps text, bold, italic, lists and links; a stored message with colors, alignment or similar is kept exactly if you edit it as HTML, and the editor warns before text edits would drop that formatting. Messages are always shown through the HTML sanitizer.
- Alerts are shared by everyone in an environment, so changes are allowed only where the whole environment is editable (RSTI dev, Galilee Test). Galilee Prod refuses them and the form is read-only there.
- Addresses per environment (from the old admin's env files): RSTI dev `https://api.rsti-dev.dyd.solutions/alerts` (so the list is `/alerts/alerts`), Galilee Test `https://api.alerts-dev.dyd.solutions`, Galilee Prod `https://api.alerts.dyd.solutions`.

## Verification (no writes)
- `verify-alerts.cjs`: the three addresses, the update body and its validation, JSON to the alerts service, RSTI and Test allowed, Prod refused even inside an RSTI-group course. All 11 suites pass.
- Galilee Test as Admin DYD: five alerts (English, Spanish, Portuguese, two Chinese), all currently Error and Inactive. The editor and preview render, and Save stays disabled until something changes.
- Note: on Galilee Test the "Spanish" alert (id 2) contains Portuguese text; that is the stored data, not the screen.
