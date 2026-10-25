# Form settings and question creation separation

Updated only GenericLMSAdmin. Reviewed the old admin's live Editable form task and its eight questions: two short-answer questions plus radio, checkbox, dropdown, linear scale, radio grid and checkbox grid. Original source creates questions with blank name and stores their visible prompt in body. The new builder now derives question-card labels from body, accepts blank legacy name, and preserves returned question type casing on updates.

UX changes:
- Form settings: title, description, task flags, assignee, introduction, coach instructions, privacy and question display; Save form settings only.
- Questions: Google Forms-inspired cards with prompt-based headings, type chips, selected-card editor and only applicable choice/grid/scale settings; Save questions only.
- Learner preview: separate view of current prompts and response controls; no response submission.
- No duplicate mandatory question-title field: one rich question prompt; original name value is preserved.
- Each expanded question shows a response preview, reflecting its own input type.
- The builder remains mounted when switching between sections so unsaved questions persist into preview. Settings/question navigation is guarded when changes in the other section need saving or discarding.

Verified in browser against actual saved questions: eight cards and matching types loaded; real linear-scale values 1 to 10 and endpoint labels appeared; grid rows/columns are separate controls; settings view excluded all question editors. Payload and validation checks passed, including blank legacy names and PascalCase types. No database writes performed during this review. Existing app source, authentication, Survey and Quiz behavior unchanged.
