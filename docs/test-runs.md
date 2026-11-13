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
