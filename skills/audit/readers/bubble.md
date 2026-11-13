# Reader: Bubble®

How to read a Bubble app through Bubble's MCP server and turn it into an app spec. Tested against Bubble's MCP as available on 13 Nov 2026 (reader version 0.1.2). Bubble describes its MCP as beta, so tool output may change; if a result does not look like what is described here, record it in `unknowns` and carry on.

Only the five read tools allowed in `SKILL.md` are used. Pass `appname` (the canonical name from `list_apps`) on every call. Leave `appVersion` unset to read `test`.

Send `get_node` reads in batches of about 10 at a time. Larger batches can get a rate-limit reply; when that happens, wait as the reply says and repeat the same read (`SKILL.md` rule 8). Count successful reads, and keep a separate count of rate-limited attempts.

## Keys

Every `key` in the spec is snake_case: lower case letters, digits and underscores, starting with a letter. When a Bubble name does not fit, convert it: lower-case it (`Home` becomes `home`), replace spaces and punctuation with `_`, and if it starts with a digit, spell out what it is (page `404` becomes `not_found`). Keep the original name in `name` and the Bubble id in `sourceId`.

## 1. Outline and plan

- `get_app_outline` gives ids and names for pages, mobile views, reusables, global elements, backend workflows, data types, option sets, styles, global expressions and plugins. Keep this list: it is your checklist for the whole run.
  - Global elements are read like reusables (section 5) with `kind: "other"`.
  - Global expressions: list each one in `unknowns` with severity `info` and its name, since the spec has no place for them yet.
- `get_app_plan_context` gives what the plan allows. Copy the whole result into `source.plan`.
- `get_node` with `id: "api"` lists the backend workflows root. Use it if the outline's backend workflow list looks incomplete.

Styles are not part of the spec. Count them only for the audit's "not carried over" list.

## 2. Data types, fields and option sets

- `list_types` returns every data type with its fields, every option set with its options and attributes, and any API Connector response types (`apiTypes`), in one call.
- Map each data type to an `entity`:
  - `key`: the type key from the outline (`user`, `check`, ...). `sourceId`: the btype id (`user`, `custom.check`).
  - The built-in `user` type gets `isUser: true`.
- Map each field:
  - `key`: Bubble field names end with a suffix that repeats the field's type. Strip it using the field's `btype`:

    | `btype` | Suffix to strip | Example |
    | --- | --- | --- |
    | `text`, `number`, `boolean`, `date`, `image`, `file`, `user`, `geographic_address`, `date_range`, `number_range`, `dateinterval` | `_<btype>` | `odometer_number` to `odometer`, `driver_user` to `driver` |
    | `custom.<type>` | `_custom_<type>` | `vehicle_custom_vehicle` to `vehicle` |
    | `option.<set>` | `_option_<set>` | `status_option_defect_status` to `status` |

    If the name does not end in the expected suffix, or stripping would leave nothing or a key that clashes with another field on the same entity, keep the full name. Keep the original in `sourceKey`.
  - `name`: the caption.
  - `type`: `text`, `number`, `boolean` (Bubble "yes / no"), `date`, `date_range`, `number_range`, `date_interval` (Bubble `dateinterval`), `file`, `image`, `geographic_address`. The built-in user `email` field is `email`. `custom.<x>` and `user` become `reference` with `ref` set to that entity key. `option.<x>` becomes `enum` with `enum` set to that option set key. Anything else (for example `api.*` types) is `unknown` plus an entry in `unknowns`.
  - `list`: from `isList`.
  - Built-in fields get `builtIn: true`: `Created By` becomes `created_by` (reference to `user`), `Created Date` becomes `created_at`, `Modified Date` becomes `updated_at`, `Slug` becomes `slug`, and the user's `email` stays `email`. Include only the built-ins that `list_types` actually lists for that type; the user type, for example, has no `Created By`.
- Map each option set to an `enum`: option `name` becomes value `key`, `caption` becomes `label`. Keep attributes, if any.
- `apiTypes` are a sign that the API Connector has calls defined. Mention them in section 7.

## 3. Privacy rules (permissions)

- Call `get_node` with `id` set to each data type's btype id (`user`, `custom.check`, ...). The result includes `privacyRules`. Bubble's own article lists privacy rules under write tools, but `get_node` does return them.
- One `permissions` entry per rule:
  - `entity`, `name` (the rule's display name), `sourceId` (rule id).
  - `isDefault: true` for the rule with id `default` (Bubble shows it as "everyone"). It has no condition.
  - `condition`: `text` is the `rendered` string, `source` is the `json`.
  - `allows`:
    - `view`: `true` when `viewAll` is true **or** `viewableFields` is not empty. In Bubble, `viewAll` means "all fields are visible"; a rule can still show some fields with `viewAll: false`.
    - `fields`: `viewableFields`, converted to your field keys.
    - `search` from `searchFor`, `searchableFields` from `constrainableFields`, `viewFiles` from `viewAttachments`, `autoSaveFields` from `autoBinding` (all converted to field keys).
- If a field never appears in any rule's `viewableFields` (on the user type this is often the built-in `email`), add an `unknowns` entry with severity `needs_review`: who can see it is not clear from the rules alone.
- Privacy rules decide what users can see and search. They do not decide who can create or change records. That comes from page guards and workflow conditions (sections 5 and 6). Say so in the audit.

## 4. Roles

Look for a field on the user entity whose type is an option set and whose name or caption contains "role", "type", "access" or "permission", and which privacy rule conditions mention. If found, set `roles.detected: true`, with `entity`, `field`, `enum` and `values`. If a rule or guard treats an empty role as its own state (for example "Role is not empty"), describe that in `emptyMeans`. If nothing fits, set `detected: false` and add an `unknowns` entry with severity `needs_review`.

## 5. Pages, mobile views and reusables

For each page, mobile view, reusable and global element in the outline:

1. `get_node` with the page id and `depth: 99` (no `expandChildren`). One call gives the page properties (title), custom states, the full names-only element tree, and the list of workflows with their trigger type, action ids, action types and action captions. From it collect:
   - `title`, and `state` (custom states) as `{ "name", "type", "list" }`. `type` is a field type (`text`, `number`, ...), an entity key when the state holds a record (`custom.checklist_item` becomes `checklist_item`), or an enum key when it holds an option set value (`option.role` becomes `role`).
   - `inputs`: names of Input, MultiLineInput, Dropdown, Checkbox, DateInput, PictureInput, FileInput, RadioButtons, SliderInput and AutocompleteDropdown elements. Bubble often returns element names cut to about 25 characters, but not always; keep them as returned.
   - `usesReusables`: `CustomElement` children, matched to reusables by name or id.
   - Repeating groups and dropdowns: note their ids for step 2.
2. For each RepeatingGroup, Dropdown and AutocompleteDropdown, `get_node` on its id to read its data source. The entity it lists goes in `dataShown`. A constraint such as "Created By is Current User" is worth a sentence in the page's `notes`. Groups also have data sources; read a Group only when a workflow on the page uses "Display data in a group" or refers to the group's data, and otherwise list it in `unknowns` with severity `info` if its name suggests it shows a record. Popups are read like Groups: a Popup can have a type of content, and a `DisplayGroupData` action can target one. The action's caption may call the popup by a default name ("Popup A"); match its `element_id` to the tree to find the real one.
3. Guards. These workflows decide who can use a page:
   - `PageLoaded` workflows whose actions include "Go to page" (ChangePage), on the page itself.
   - In reusables used on every page (a nav bar, a header): `PageLoaded`, user events such as "User is logged in" (`LoggedIn`) and "User is logged out", when their actions go to another page or log the user out. These apply to every page that uses the reusable; list them on the reusable and mention them in each page's `access`.

   Read each guard event and its ChangePage or LogOut action with `get_node` (section 6 reads them anyway; do not read them twice). **The condition can sit on the event or on the action; check both.** Add a `guards` entry with the condition (`text` and `source`), `effect: "redirect"` (or `"other"` for log-outs), `to` set to the destination page key (the action's `element_id` matched to a page id), and `sourceId` set to the action id. A guard event with two actions (for example log the user out, then go to a page) gets one `guards` entry per action. When the condition sits on the event, each entry carries the event's condition.
4. `access`: one plain sentence on who can open the page, based on its guards and any guards in reusables it uses. If there are none, write "anyone with the link". For reusables and global elements write "wherever it is placed". For an empty mobile view write "empty; nothing to open".
5. Suggested `route`: `/` for `index`, `/<page-key>` otherwise. Mobile views and reusables get no route. A page Bubble uses for password reset (for example `reset_pw`) still gets a route; note that the rebuilt app's auth library replaces it.

Element styles, sizes and layout are not part of the spec.

## 6. Workflows

Workflow ids, action ids, types and captions come from the page read in section 5 step 1. For backend workflows, use the outline ids.

1. `get_node` on each event id (no `expandChildren`; it adds nothing here). This gives the trigger's `element_id` and its condition, and for backend workflows the endpoint settings.
2. **Name triggers from the tree, not the caption.** Captions use Bubble's default names ("Button A is clicked") that often do not match the element's real name. Match the event's `element_id` to the element tree from section 5 and use that name in `trigger.element`. Put the `element_id` itself in `trigger.elementId`: names are not always unique (a nav bar and its sign-in popup can both hold a "Button Sign in"), and the id tells them apart. Events with no element (page load, user events, backend workflows) have neither.
3. Read action properties with `get_node` on the action id for:
   - every action that changes data or calls out: `NewThing`, `ChangeThing`, `MakeChangeCurrentUser`, `DeleteThing`, `DeleteListOfThings`, `ScheduleAPIEvent`, `TriggerAPIEvent`, API Connector calls, email actions;
   - every sign-up, log-in, log-out and password action (`SignUp`, `LogIn`, `LogOut`, `ResetPassword`, `UpdateCredentials`, `SendPasswordResetEmail`);
   - every `ChangePage` and `DisplayGroupData`, because they often carry role conditions or data sources;
   - every `OpenURL`, for its destination;
   - anything whose type you do not recognise.

   You can skip the property read for `ShowElement`, `HideElement`, `ToggleElement`, `ResetGroup`, `ResetInputs`, `RefreshPage`, `PauseWFClient`, `ScrollTo` and `SetCustomState`. Skipped actions may still have an "Only when" condition you did not see: add one `unknowns` entry with severity `info` that says so and lists the workflows affected.
4. Map the workflow:
   - `key`: `<page-key>_<short_name>` for page workflows, `<reusable-key>_<short_name>` for reusable workflows, `api_<endpoint_name>` for backend workflows. Unique, snake_case. `name`: a short readable name ("Submit check", "Mark defect fixed").
   - `scope`: `page`, `reusable` or `backend`. Use `scheduled` only for workflows that run on a recurring schedule, and `data_trigger` for database trigger events. A backend workflow started once by a "Schedule API workflow" action is still `backend`.
   - `page`: the page key for page workflows, the reusable key for reusable workflows, nothing for backend workflows.
   - `trigger.type`: `ButtonClicked` to `button_click` (a click on a Text element also comes back as `ButtonClicked`; map it to `button_click` too), `PageLoaded` to `page_load`, `InputChanged` to `input_change`, `APIEvent` to `api_endpoint`, `OnError` (an element "has an error running a workflow") to `error`, user events (logged in, logged out) to `user_event`, other element events to `element_event`, everything else `other`. Always keep Bubble's event type in `trigger.sourceType`.
   - `trigger.condition`: the event's own condition, for page and backend workflows alike.
   - For backend workflows: `trigger.publicEndpoint` from "Expose as a public API workflow", `trigger.ignoresPermissions` from "Ignore privacy rules when running the workflow". Leave `trigger.element` out.
   - `steps`: in order, numbered from 1. `type` from this table; keep Bubble's action type in `sourceType`.

     | Bubble action | Step type |
     | --- | --- |
     | NewThing | create |
     | ChangeThing | update |
     | MakeChangeCurrentUser | update_current_user |
     | DeleteThing | delete |
     | DeleteListOfThings | delete_list |
     | SignUp | sign_up |
     | LogIn | log_in |
     | LogOut | log_out |
     | ResetPassword | reset_password |
     | UpdateCredentials | update_credentials |
     | SendPasswordResetEmail | send_password_reset |
     | SendEmail | send_email |
     | ChangePage | navigate |
     | OpenURL | open_url |
     | ScheduleAPIEvent | schedule_backend |
     | TriggerAPIEvent | trigger_backend |
     | API Connector call | api_call |
     | DisplayGroupData | display_data |
     | SetCustomState | set_state |
     | ShowElement | show |
     | HideElement | hide |
     | ResetGroup, ResetInputs | reset |
     | PauseWFClient | pause |
     | RefreshPage | refresh |
     | anything else | other |

   - `entity`: the data type the step creates, changes or deletes. `update_current_user` steps use the user entity.
   - `target`: which record, page or element the step acts on, in plain words.
   - `sets`: one entry per field the step sets, from `initial_values` (create) or `changes` (update). Bubble returns these as one property whose `json` is an object of numbered entries, each with a `key` (the Bubble field name) and a `value`. Build one `sets` entry per numbered entry: `field` is your field key; `value.source` is that entry's `value` JSON; `value.text` is a readable version of it (take the matching block of the multi-line `rendered` string, or write it from the JSON). An entry with a `key` and no `value` clears the field: write `{ "field": "<key>", "clear": true }`. Values come in three kinds:
     - An expression (an object with a `type`, such as `GetElement` or `CurrentUser`): `source` is the JSON, `text` is the readable version.
     - An option set value: it comes back as expression JSON of type `OneOptionValue`, not as a plain value. Keep the JSON as `source` and write the option's caption as `text` (for example `Open`).
     - A static value (text, a number or yes / no): write it in `text` with no `source`. `text` is always a string: booleans are `"true"` or `"false"`, and numbers are written as strings (`"10"`).

     When every value in an action is static, the MCP returns the property with a plain `value` object holding the numbered entries, and no `expression`, `json` or `rendered`. Read the entries from `value` in the same way.
   - `inputs`: every other property that matters for a rebuild, as `{ "name", "value" }` where `value` is a condition object: "Thing to change", the list for `DeleteListOfThings`, the data source for `DisplayGroupData`, the destination for `OpenURL` (when the URL is typed in, the host only; when it is a dynamic expression, the expression as `text` and `source`, since there is no fixed host), the endpoint, date and "ignore privacy rules" flag for `ScheduleAPIEvent` (the MCP returns the endpoint as the backend workflow's id; match it to the outline and record that workflow's name and its spec key, for example `wipe_demo_data` and `api_wipe_demo_data`), and the email and password inputs for sign-up and log-in (the element name only, or `[literal value omitted]` when the value was typed in).
   - `condition`: only the action's "Only when" condition. Never put other inputs here; a generator reads `condition` as "run this step only when".
5. Mark `isCore: true` on workflows where a failure halfway would leave the data inconsistent: workflows that write to two or more different data types, or that write a record and then change another record based on it. A workflow that creates several records of the same type in one go (for example seeding default checklist items) is not core. Sign-up and log-in flows are not core.

Read conditions and values from the expression JSON, not only from the rendered text. The rendered text can drop details: for example, two different searches with different constraints can both render as `Search for Users:count`, and `(a + b) / 2` can render as `a + b / 2`. When the two disagree, trust the JSON and mention the gap in the workflow's `notes`.

The rendered text also calls elements by default names that may no longer exist ("Input A's value", "Group B's Defect", "Popup A's Vehicle"), in the same way workflow captions do. The JSON holds the element's id (`element_id`). Match each id to the element tree from section 5 and write the real element name in `text` ("Input Odometer's value"). Keep `source` exactly as returned.

## 7. Integrations

- Plugins come from the outline. Map `mapping`:
  - `built_in`: something the destination stack does natively (for example the API Connector becomes typed `fetch` calls).
  - `replaceable`: a well-known service with a standard library or HTTP API (Stripe, SendGrid, Google Maps and similar). Name the replacement.
  - `unknown`: anything else. Add an `unknowns` entry with severity `needs_review`.
- API calls: the allowed tools cannot open API Connector call definitions. When the API Connector is installed, list any calls you saw used in workflow steps (by caption) in `apiCalls`, mention any `apiTypes` from `list_types`, and add one `unknowns` entry with severity `needs_review` saying the call list and their hosts need a person to check in the editor's Plugins tab. Never record keys; Bubble's MCP does not expose them anyway.
- Files: every `file` or `image` field goes in `integrations.files`.
- Email: if a workflow step sends email (including password reset email), note how in `integrations.email`.

## 8. What the reader does not read

Say these plainly in the audit; they are limits by design, not errors:

- Records and row counts (rule 2). Data moves later through the platform's own export.
- Passwords. Bubble does not export them, so users of a rebuilt app reset their password at first login.
- API keys and secrets, and any plain-text values typed into actions (rule 5).
- Visual design: styles, sizes, layout, responsive settings.
- Plugin internals and API Connector call definitions.
