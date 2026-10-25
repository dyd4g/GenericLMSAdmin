# Form task builder (EditableForm)

Scope: changes only in GenericLMSAdmin. Existing APIs, authentication and original repositories unchanged. Survey and Quiz remain separate and are not converted into Form behavior.

Implemented:
- Create/update EditableForm metadata using existing POST /api/lessons/{id}/forms (includes type=EditableForm on creation) and PUT /api/forms/{id}.
- Form introduction, coach instructions, question display (All/Single) and private-response setting. Existing response/scoring-related fields in the form payload are retained, not repurposed.
- Save a new Form task before adding persisted questions.
- 12 existing input types: singlelinetext, multilinetext, dropdown, radiobox, checkbox, radioboxgrid, checkboxgrid, linearscale, date, time, datetime, description.
- Rich question text, title, required toggle, choice options, grid columns/rows, checkbox selection limits and supported scale bounds/labels.
- Question copy (new draft), delete confirmation, move up/down and separate Save questions action.
- Learner preview with local-only responses. This does not submit responses or implement learner execution.
- Draft/Test read-only rules carried through. Unsaved question changes block task/mode switching and can be discarded by reloading actual form questions.

Contracts preserved:
- Questions: POST /api/forms/{id}/questions, PUT/DELETE /api/questions/{id}.
- Choices: POST /api/questions/{id}/options, PUT/DELETE /api/options/{id}; body, order, description.
- Grid rows: POST /api/questions/{id}/subQuestions, PUT/DELETE /api/subQuestions/{id}; body and order.
- Parent question payload contains existing name/type/body/order/required/weight/selection/scale fields; nested choices and rows are persisted through their separate original endpoints.
- Existing question type is locked to avoid destructive conversion of saved nested data. New questions can select any supported type.

Verification: JSX parsing passed. Tests covered payload construction for all 12 types, required description behavior, empty choice/grid rejection, selection-limit validation, scale boundaries, ID validation and preservation of existing Form settings. Existing write-contract checks also passed. Browser verified distinct Form/Survey/Quiz choices and Form selection in Add task; no RSTI records were inserted during verification. Full remote question persistence has not been exercised by the agent yet.

Limitations: question saves are multiple API requests, not a backend transaction. Completed child IDs are retained in the draft state to reduce duplicate creation on retries; a missing create ID requires reloading before retrying. Form response reporting, Quiz scoring/answer keys and Survey-specific rules are not implemented in this step.
