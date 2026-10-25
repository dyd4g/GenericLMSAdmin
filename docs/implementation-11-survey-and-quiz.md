# Survey and Quiz editors

Changes only in GenericLMSAdmin/mui-preview. Existing repositories, APIs and authentication unchanged. Both reuse the Form builder UI (settings tab, searchable question list with a detail editor, drag ordering, learner preview).

## Survey
- Survey is routed through the same settings and question builder as Editable Form (LessonWorkspace `isForm`). All 12 question types are available. No answer keys or scoring.
- Create uses POST /api/lessons/{id}/forms with type=Survey; update uses PUT /api/forms/{id}. As in the old admin, a Survey sends minPassingScore null (Editable Form keeps the earlier 0 default). Labels read "Survey title" and "Save survey settings".

## Quiz
- Task settings: Minimum score entered as a percentage (0 to 100) and sent as a 0 to 1 ratio (70 is stored as 0.7); "Reveal answers when a trainee fails" (revealAnswersOnFail). Default minimum score is 0, matching the old admin.
- Question types limited to the six the old Quiz editor offers: short answer, multiple choice (radio), dropdown, checkboxes, multiple-choice grid, checkbox grid. Existing questions of other types still load and can be edited without an answer key.
- New quiz questions are created with weight 1 (as in the old admin); Survey and Form questions keep a null weight.
- Answer keys are edited inline: a radio per option (radio and dropdown), checkboxes per option (checkboxes), a row-by-column table (grids) and an Expected answer field (short answer). Questions show "No correct answer" in the list until a key is set. Save is blocked until every quiz question has a key (every grid row needs a correct column).
- Answer keys are written after the question and its options and rows exist, and only the difference from the stored key is sent (lib/quiz-key.js):
  - Radio and dropdown: POST /api/questions/{id}/expectedOptions with the option ID. The server replaces the previous answer.
  - Checkboxes: POST /api/questions/{id}/expectedOptions to add; DELETE /api/expectedOptions/{optionId} to remove.
  - Grids: POST /api/subQuestions/{rowId}/expectedOptions to add (radio grid replaces); DELETE /api/subQuestions/{rowId}/expectedOptions/{optionId} to remove.
  - Short answer: PUT /api/questions/{id}/expectedAnswer with the text as a JSON string.

## Verification
- Tests (no network): verify-survey.cjs (payloads, delete path, ordering), verify-quiz.cjs (answer-key validation and the exact requests above, unchanged keys send nothing) and the earlier verify-forms.cjs all pass.
- Live, approved test on RSTI course 1, lesson 2 (Draft course), using throwaway tasks "ZZ TEMP Survey" and "ZZ TEMP Quiz":
  - Quiz saved as type Quiz with minPassingScore 0.7. Radio key saved and replaced when changed (15 then 16 to 15). Checkbox key saved [18, 19], then changed to [19, 20] (add and delete both work). Checkbox grid key saved per row, then one cell removed ([21, 22] to [21]). Short answer saved "Paris". Saving a grid with an unanswered row was blocked by validation and wrote nothing.
  - Survey saved as type Survey; a Linear scale question (not available in Quiz) saved with no weight.
  - Both tasks were deleted with the Delete button; the lesson matched its original three tasks and the Editable Form kept questions 1, 3, 4, 5, 6, 7, 8.

## Notes and limits
- The old admin's FormTaskPayloadSchema parses minPassingScore with max 1 and a catch to 0, so a percentage sent through it would silently become 0. This app sends the ratio; the stored 0.7 confirms the API accepts it.
- Answer keys are separate requests, not a transaction. Completed steps are checkpointed so a retry only sends what is missing.
- Not built: Test tasks, Quiz auto-correction flag (old admin kept it false), trainee-facing quiz execution and scoring, and keyboard drag ordering is still unconfirmed (see implementation-10).
- Existing quiz keys that the old admin saved were not re-read in this test; loading maps expectedOptions IDs from the server, as the old admin did.
