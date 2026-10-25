# Editable Form cleanup and drag ordering

Changes only in GenericLMSAdmin.

- Removed the Required response toggle and required markers from Editable Form questions. New questions remain non-required by default; existing API flags are preserved when editing/reordering. No answer-key/correct-answer controls are shown. Survey/Quiz behavior is unchanged.
- Replaced question up/down arrows with drag handles using the existing dnd-kit dependencies. Pointer/touch/keyboard sensors, disabled state in Test mode, and stable question keys. Save questions persists the new order using existing question PUT operations.
- Order-only saves skip choice/grid completeness validation and skip nested child writes. This allows sorting existing incomplete questions without modifying options or grid rows.
- Removed response previews inside individual question cards. Learner preview is the only response preview.

Verification: JSX parse checks and form tests passed, including reorder identity/order flags, original-array immutability, legacy type casing/required-flag retention, and order-only handling of empty options. A fresh browser check reached the sign-in-required state because no current cookie was available in that browser session; live drag/persistence verification was not completed in this step. No database mutations performed during verification.
