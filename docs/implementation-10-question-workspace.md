# Question workspace and grid defaults

Changes only in GenericLMSAdmin/mui-preview (FormBuilder.jsx). Existing repositories, APIs and authentication unchanged.

- Question editing is now a list and detail layout: a searchable, drag-sortable question list on the left and a single-question editor on the right with a sticky header (position "Question N of M", Previous/Next, copy, delete). Narrow screens show one pane at a time.
- Multiple-choice grid and Checkbox grid questions now start with three blank columns and three blank rows, so nobody has to add them one by one. This applies to a new question and to changing the type of a new, unsaved question. Switching to another type clears them. Saved questions keep their locked type and existing columns and rows.
- Blank defaults remain subject to existing validation: every column and row must be filled before Save questions succeeds.
- Grid columns are labelled "Column n" (previously "Option n", which is still used for non-grid choice types).

Verification: JSX parse checks and the form payload tests (verify-forms.cjs) passed. In the browser, signed in as the RSTI admin on a Draft course, the split editor loaded the seven existing questions with search and Previous/Next. Adding a new Multiple-choice grid and a new Checkbox grid each showed three column and three row fields. The drafts were discarded and nothing was saved. 
Live write test (approved, RSTI course 1, form task 6, Draft course): created a throwaway Multiple-choice grid "ZZ TEMP - delete me" with three columns and three rows and saved it; the server returned it as question 9 with all six child values. Dragged it to the top with a pointer drag and saved; the server returned it first, followed by the original seven. Deleted it through the editor; the server list returned to questions 1, 3, 4, 5, 6, 7, 8 with their original choice and row counts (3, 3, 2/2, 3/3 for the choice and grid questions).

Findings:
- Keyboard dragging (Space, Up arrows) on the question handles was unreliable in the automated browser: one attempt moved a question two places, a second moved nothing. Pointer drag worked. Keyboard reordering still needs a manual check.
- The question API does not return an order value, so the original order could only be compared by sequence. Saving an order writes explicit order values to all seven existing questions, which were stored without one before; their relative order is unchanged.
- The delete confirmation names the question "Untitled question" because the internal name is blank for questions created by this builder (as in the old admin). Fixed: the dialog now shows the question's prompt text (the same text used on the question cards), falling back to the name and then "Untitled question". Parse check only; not re-checked in the browser.
