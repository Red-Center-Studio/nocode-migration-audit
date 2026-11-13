# Test runs

Every run of the skill against a real app, what went wrong, and what changed because of it. This list feeds the "What the audit does not do" section of the README.

## Run 1: prestart-fleet, 13 Nov 2026, reader 0.1.0

How it was run: a fresh Claude Code agent with no other context followed `SKILL.md` as written, on the Bubble® app `prestart-fleet`, test version.

Result:

- 184 MCP calls: `get_app_outline` 1, `get_app_plan_context` 1, `list_types` 1, `get_node` 181. 0 writes, 0 record, log or metric reads. Only `prestart-fleet` was opened.
- `app-spec.json` passed the validator on the first try. Complexity 157 (Medium).
- Output is in [`examples/prestart-fleet/`](../examples/prestart-fleet/). It was produced by reader 0.1.0, before the fixes below; it also passes the 0.1.1 validator.

Problems the run found, and the fix in 0.1.1:

| Problem | Fix |
| --- | --- |
| `get_node` with `expandChildren: true` on a workflow event returns action captions only, not action properties | Reader no longer suggests it; each data-changing action is read on its own |
| The `depth: 1` page read was redundant with the `depth: 99` read | One page read only |
| Workflow captions use stale default element names ("Button A is clicked") | Reader names triggers from `element_id` matched to the element tree |
| Literal values typed into actions (a demo account's email and password) come back in plain text | New rule: never copy them, write `[literal value omitted]`, list the action under "Needs care" |
| `viewAll` means "all fields visible", not "can view"; a rule can show some fields with `viewAll: false` | `view` is true when `viewAll` is true or `viewableFields` is not empty |
| No rule for page names that are not valid keys (`404`, `Home`) | New "Keys" section |
| Field suffix stripping covered only three examples | Full suffix table by `btype`, with a clash rule |
| `dateinterval` mapping not stated; user type has no `Created By` | Stated |
| `apiTypes`, global elements and global expressions not covered | Covered |
| Guards in a shared nav reusable (`LoggedIn` events) were missed | Reader reads guards in reusables used on every page |
| Only repeating groups fed `dataShown` | Dropdowns too; groups when a workflow uses their data |
| `OnError` trigger and the password and display-data actions were not mapped | New trigger type `error`; new step types `reset_password`, `update_credentials`, `send_password_reset`, `display_data` |
| `ChangePage` was on neither the read nor the skip list, but carries role conditions | Always read |
| Bubble returns all set fields as one multi-line string; static values have no expression; "clear a field" has no value | Reader explains the numbered-entry JSON; schema allows a static value as text and `clear: true` |
| No place for action inputs (the record to change, the list to delete, a data source, a schedule date), so they ended up in `condition`, which a generator reads as "only when" | New step property `inputs`; `condition` is only the run condition |
| "Scheduled" was ambiguous for a backend workflow started once | `scheduled` only for recurring schedules |
| Backend workflow keys, reusable workflow `page`, and `isCore` were unclear | Defined |
| Display name, `appVersion` and reader version had no source | `list_apps` always called once; `appVersion` recorded; reader version stated in the skill |
| No warning about how many calls a run takes | Skill tells the user the app's size after the outline, with the measured count from this run |
| `page.state` shape undefined | Defined as name, type, list |
| Validator did not check fields in `sets`, `searchableFields` or `autoSaveFields` | Checked, with tests |
| Empty mobile view still scored 3 points; template had no row for reusable workflows | Fixed in the template; scoring table now version 0.1.1 |

Limits confirmed by the run (not bugs):

- API Connector call definitions cannot be read with the allowed tools.
- Element names come back cut to about 25 characters.
- Rendered expression text can drop details (search constraints, brackets in arithmetic). The JSON is complete, and the spec keeps it.

## Run 2: prestart-fleet, 13 Nov 2026, reader 0.1.1

How it was run: the skill was installed as a plugin from the marketplace and run with `/nocode-migration-audit:audit prestart-fleet`, on the same Bubble app, test version. A read-only check of the output against ten points (a to j below) followed.

Result:

- 190 MCP calls: `list_apps` 1, `get_app_outline` 1, `get_app_plan_context` 1, `list_types` 1, `get_node` 186. 0 writes, 0 record, log or metric reads. Only `prestart-fleet` was opened.
- 18 further `get_node` attempts got a rate-limit reply, all in one batch of 47 parallel reads. Each was repeated once and succeeded. They are not part of the 190.
- `app-spec.json` passed the validator on the first try. Complexity 154 (Medium).
- Output is in [`examples/prestart-fleet/`](../examples/prestart-fleet/) and replaces the Run 1 sample. It was produced by reader 0.1.1, before the fixes below; it also passes the 0.1.2 validator.

Checks on the output, all passed:

| | Check |
| --- | --- |
| a | `list_apps` called once; the report title uses the app's display name |
| b | `source.appVersion` is `test` and `source.reader.version` is `0.1.1` |
| c | `source.writeCallsMade` is 0 |
| d | No email address or password in either file; typed-in credentials show as `[literal value omitted]` |
| e | Workflow triggers use real element names from the page tree |
| f | A rule with `viewAll` false and some viewable fields has `view: true` |
| g | Page `404` has key `not_found`; the mobile view key is lower case |
| h | Cleared fields use `clear: true`; action inputs are in `inputs`, not in `condition` |
| i | Guards from the Nav reusable (logged-in events) are listed |
| j | The registered mark is on the first mention of Bubble in `audit.md` |

Problems the run found, and the fix in 0.1.2:

| Problem | Fix |
| --- | --- |
| The skill said to stop when a read fails, and did not say what to do with a rate-limit reply | Rule 8: a rate-limit reply is not a failure; wait and repeat the same read |
| No guidance on how many reads to send at once | Rule 8 and the reader: batches of about 10 |
| Unclear whether rate-limited attempts count as MCP calls | Successful reads are counted; rate-limited attempts are reported as a separate number, in the skill, the reader and the template |
| The measured read count in the skill came from one run | Both runs are given: 184 and 190 reads |
| The reader said set fields always come back as expression JSON; when every value in an action is static, the MCP returns a plain `value` object with no expression | Stated in the reader |
| The reader's example treated an option value ("Open") as a plain value; it comes back as `OneOptionValue` JSON | JSON kept as `source`, the option caption as `text` |
| `text` must be a string, but static values can be booleans or numbers | Booleans are `"true"` or `"false"`, numbers are written as strings |
| Rendered expression text uses stale default element names ("Input A's value"), not only workflow captions | Reader resolves each `element_id` against the tree and writes the real name in `text` |
| Element names are not unique (two "Button Sign in" in one reusable), and the spec had no place for the element id | New optional `trigger.elementId` in the schema, filled from `element_id`, with a test |
| "Element names are cut to about 25 characters" was not always true | Reader says "often" |
| A click on a Text element comes back as `ButtonClicked` | Mapped to `button_click`, stated |
| `OpenURL` was on neither the read nor the skip list; a dynamic URL has no host to record | Always read; a dynamic URL is recorded as its expression, a typed-in URL as host only |
| Popups were not covered; `DisplayGroupData` can target one | Read like Groups |
| `ScheduleAPIEvent` returns the backend workflow's id, not its name | Reader matches the id to the outline and records the workflow key |
| No way to give a page state whose type is an option set | `page.state.type` may be an enum key; schema description and reader updated, with a test |
| Rule 5 did not say whether typed-in values other than credentials are omitted | Only email addresses, passwords, tokens and keys are omitted; labels, default text and the app's own host name are kept |
| The API Connector unknowns entry had no severity | `needs_review` |
| The role table had no marking for an action protected only by a page redirect | Such cells read "Yes (page guard only)", with the meaning explained under the table |
| Unclear whether a guard event with two actions is one guard or two | One guard per action, each carrying the event's condition |
| The validator was offered only for a clone of the repo, though the plugin install folder also holds it | Skill says where the validator is in both cases, runs it when Node.js and `node_modules` are present, and never runs `npm install` |

The Run 2 sample predates these fixes, so it has no `trigger.elementId` and its role table marks page-guard-only cells "(inferred)".

Limits confirmed by the run (not bugs):

- API Connector call definitions cannot be read with the allowed tools.
- Element-level conditionals (which buttons each role sees) and Text element expressions are not read. The role table is built from privacy rules, page guards and workflow conditions.
- Show, hide, reset, pause, refresh and set-state actions are not opened, so any run condition on them is not seen. The spec lists the workflows affected.
