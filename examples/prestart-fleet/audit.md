# App audit: PreStart: Fleet Pre-Start Checks and Defects

A fleet pre-start check app built on Bubble® with three roles (admin, workshop and driver): drivers submit a daily vehicle check, failed items become defects for the workshop, and admins manage vehicles, the checklist and the team. Almost all of it maps cleanly to code; the parts that need the most care are who is allowed to change data (several actions rely only on a page redirect) and the demo and first-time-setup logic, which includes typed-in demo credentials and a workflow that deletes data with privacy rules switched off.

| | |
| --- | --- |
| Source | Bubble, app `prestart-fleet`, version `test` |
| Read on | 2026-11-13 (UTC) |
| Reader | nocode-migration-audit 0.1.1 |
| MCP calls | 190 (all reads; 0 writes, 0 record reads) |
| Complexity | 154 (Medium) |

## What is in the app

| Part | Count |
| --- | --- |
| Data types | 6 |
| Fields (excluding built-in) | 37 |
| Option sets (options) | 4 (11) |
| Privacy rules (excluding defaults) | 8 |
| Pages / mobile views / reusables | 11 / 1 / 1 |
| Workflows (page / reusable / backend) | 46 / 14 / 1 |
| Workflow steps | 124 |
| Plugins | 1 |
| Unknowns | 7 |

The data types are User, App Settings, Vehicle, Check, Defect and Checklist Item. The option sets are Role, Severity, Defect Status and Vehicle Status. The mobile view (Home) is empty.

## Complexity score

This score compares apps with each other; it is not a time or cost estimate.

| Item | Count | Points each | Points |
| --- | --- | --- | --- |
| Data type | 6 | 2 | 12 |
| Field, excluding built-in fields | 37 | 0.5 | 18.5 |
| Option set | 4 | 1 | 4 |
| Privacy rule, excluding defaults | 8 | 2 | 16 |
| Page or mobile view (the empty mobile view is skipped) | 11 | 3 | 33 |
| Reusable | 1 | 2 | 2 |
| Workflow (any scope) | 61 | 0.5 | 30.5 |
| Workflow step | 124 | 0.25 | 31 |
| Backend, scheduled or data-trigger workflow (extra) | 1 | 3 | 3 |
| Plugin mapped `replaceable` | 0 | 2 | 0 |
| Plugin mapped `unknown` | 0 | 5 | 0 |
| API call | 0 | 3 | 0 |
| Unknown with severity `needs_review` | 2 | 2 | 4 |
| Unknown with severity `blocks_rebuild` | 0 | 5 | 0 |
| **Total** | | | **154** |

Band: Medium.

## What maps cleanly

- The 6 data types become 6 database tables. Every link between them is a plain single reference (a check points at one vehicle and one driver; a defect points at one vehicle and one reporter). There are no list fields.
- The 4 option sets become fixed value lists. None has extra attributes.
- The 8 privacy rules become one server-side permission check per table. They use only three ideas: the user's role, "this record is mine", and "role is not empty".
- The 11 pages become routes. `reset_pw` is replaced by the new app's sign-in library, and `404` becomes the router's catch-all page.
- The Nav reusable becomes one shared header component with the sign-in popup.
- Most of the 61 workflows are one-step actions (go to a page, save one record) and become simple server handlers. 31 of the 124 steps are show, hide, reset or set-state steps that become ordinary front-end code.
- The two image fields (Check photo and Defect photo) move to file storage.
- The only email the app sends is the password reset email, which the new sign-in library handles.
- The API Connector plugin has no calls in any workflow that was read, so there is nothing to port unless the check in "Unknowns" finds one.

## Who can do what

| Action | Admin | Workshop | Driver | No role (signed in) | Signed out |
| --- | --- | --- | --- | --- | --- |
| View vehicles | Yes | Yes | Yes | No | No |
| View defects | Yes | Yes | Yes | No | No |
| View checklist items | Yes | Yes | Yes | No | No |
| View checks | All | All | Own only | No | No |
| View users | All | Own record | Own record | Own record | No fields; can search by role and demo flag |
| View App Settings | All fields | Business name and support email | Business name and support email | Business name and support email | Business name and support email |
| Open check page and submit a check (creates a check, may create a defect, updates the vehicle) | Yes | Yes | Yes | No | No |
| Open defects page; start work; mark fixed | Yes | Yes | Yes (see Needs care 2) | No | No |
| Open fleet page; add or edit vehicles | Yes | Yes | No | No | No |
| Open history page | Yes | Yes | Yes (own checks, all fixed defects) | No | No |
| Open setup page | Yes | No | No | No, except on an unclaimed copy (see Needs care 3) | No |
| Assign roles, remove access | Yes | No (inferred) | No (inferred) | No (inferred) | No (inferred) |
| Edit business details | Yes | No (inferred) | No (inferred) | No (inferred) | No (inferred) |
| Add, edit, reorder, switch off or delete checklist items | Yes | No | No | No | No |
| Open account page; change own name and password | Yes | Yes | Yes | Yes | No |
| Create an account, sign in, ask for a password reset | n/a | n/a | n/a | n/a | Yes |

Cells marked "(inferred)" rest on the setup page guard only; the workflows behind them have no condition of their own. Privacy rules cover viewing and searching; create and change rights come from page guards and workflow conditions, and the rebuild should enforce them on the server.

## Needs care

1. **Role changes have no check of their own.** Setup page, workflows `setup_set_role_driver`, `setup_set_role_workshop`, `setup_set_role_admin`, `setup_remove_access` and `setup_save_details`. None has a condition on the workflow or the action. The only protection is the page-load redirect for non-admins, which runs in the browser. In the rebuild, check "is admin" on the server for each of these.
2. **Drivers are not kept out of the defects page.** The guard on `defects` only redirects users with no role, and `defects_start_work` and `defects_mark_fixed` have no role condition. A driver who opens `/defects` can mark a defect fixed and put a vehicle back in service. Decide whether that is intended; if not, limit both actions to workshop and admin.
3. **First-time setup lets a user make themselves admin.** `setup_claim_admin` (setup page) and the Nav guard `nav_first_admin_redirect`. When the app is not on the original demo address and there is no non-demo admin, any signed-in user is sent to setup and can claim admin. This is a one-time bootstrap. In a rebuild, replace it with a seeded first admin or an invite, and remove the workflow.
4. **A backend workflow deletes data with privacy rules switched off.** `api_wipe_demo_data` deletes every defect, check and vehicle and every demo user. It is not a public endpoint, and it is started only by `setup_claim_admin`. It should not exist in a production rebuild; if it is kept, it needs a server-side admin check and a confirmation.
5. **Demo log-in actions contain a typed-in email and password.** Index page, workflows `index_demo_driver`, `index_demo_workshop`, `index_demo_admin` (log-in actions) and `index_demo_driver_error`, `index_demo_workshop_error`, `index_demo_admin_error` (sign-up actions). The values are written as `[literal value omitted]` in the spec and are not copied anywhere in this audit. Treat that password as public and do not reuse it. The error workflows also let the browser choose the new demo user's role, which is only acceptable for a demo.
6. **Behaviour depends on the app's web address.** 15 conditions test whether the home URL contains `prestart-fleet.bubbleapps.io`: demo buttons only work there, while saving a name, changing a password, claiming admin and the wipe only work elsewhere. A rebuild needs one explicit "demo mode" setting instead, or none of this at all.
7. **Three workflows should each become one server transaction.** `check_submit` (creates a check, sets passed, creates a defect when items failed, updates the vehicle odometer, takes the vehicle off road when the severity is critical), `defects_mark_fixed` (vehicle back in service, then defect fixed) and `setup_claim_admin` (user becomes admin, then the wipe is scheduled). If one stops halfway the data is left inconsistent.
8. **Two rules in the check and defect flow to confirm.** In `check_submit`, the vehicle goes off road whenever the severity dropdown says critical, even if every item was ticked and no defect was created. In `defects_mark_fixed`, the vehicle goes back in service even if it has other open defects.
9. **Anyone can search users by role and demo flag.** The default rule on User shows no fields but allows searching on Role and Is Demo, including for signed-out visitors. The app needs this to count admins. In a rebuild, keep that count on the server and do not expose a user search.
10. **Who can see a user's email is unclear.** The built-in email field is not in any rule's list of visible fields (see Unknowns).
11. **Rendered text hides details in five places.** The "real admin" test renders as `Search for Users:count - Search for Users:count`; the JSON shows it is all admins minus demo admins (`nav_first_admin_redirect`, `nav_sign_up`, `setup_guard_not_admin`, `setup_claim_admin`). The reorder steps in `setup_move_item_up` and `setup_move_item_down` render as `a + b / 2`; the JSON is (a + b) / 2. The spec keeps the JSON for each.
12. **Copied names.** Check and Defect store the vehicle name and the driver or reporter name as text next to the reference. They will not follow later renames. Decide whether to keep these copies (useful as a historical record) or read the name through the reference.
13. **API Connector.** Installed, with one response type ("text stream") and no call found in any workflow. The call list could not be read (see Unknowns).
14. **Leftovers.** `reset_pw` and `404` still have the default page title "Bubble | No-code apps". The Home mobile view is empty. App Settings is a single record created on page load by `setup_create_settings`; seed it in a migration instead. The link opened by `setup_open_help` is whatever URL an admin saved, with no check.

## What does not move automatically

- User passwords: Bubble does not export them, so users reset their password at first login.
- Records: the audit does not read data. Data moves later through the platform's own CSV or JSON export, with row counts checked after import.
- API keys and secrets: re-enter them in the new app's secret store.
- Visual design: styles and layout are rebuilt, not copied. The app has 75 styles.
- Uploaded photos: check and defect photos are stored as links to Bubble's file storage. The files need copying to the new storage and the links rewriting.
- Demo accounts and the demo password: do not carry these over.
- The video on the index page: its source was not read and it is likely hosted elsewhere.
- API Connector call definitions, if any exist.

## Before you switch over

- Sign-in: test create account, sign in, sign out and password reset in the new app. Tell users they must set a new password at first login.
- Roles: after importing users, check that every user has the right role and that at least one real admin exists before removing the claim-admin flow.
- Password reset links: old reset emails point at `/reset_pw` on the old app and stop working.
- Old URLs: add redirects for `/check`, `/defects`, `/fleet`, `/setup`, `/history`, `/account`, `/terms`, `/privacy` and `/reset_pw` if the new routes differ.
- Photos: confirm that check and defect photos open from the new storage, not from the old app's file links.
- Email: set up a sending domain for password reset email and send a test.
- Row counts: after import, compare the number of users, vehicles, checks, defects and checklist items with the export, and confirm there is exactly one App Settings record.
- Permissions: sign in as a driver and try to open `/fleet`, `/setup` and `/defects`, and try each admin action, to confirm the server refuses what it should.
- Demo data: make sure no demo users or demo vehicles were imported.
- Switching back: keep the Bubble app running and unchanged until the new app has been checked. If something goes wrong, point the domain back and re-export any records created in the meantime.

## Unknowns

| Where | What | Why | Severity |
| --- | --- | --- | --- |
| Entity user, field email | The built-in email field is not listed in any privacy rule's viewable fields. | Who can see a user's email is not clear from the rules alone; the setup page shows a team list and the account page shows "Signed in as". | needs_review |
| Integrations: API Connector plugin | The plugin is installed and reports one response type ("text stream"). No workflow step that was read calls an API. | The allowed tools cannot open API Connector call definitions. A person should check the Plugins tab for the calls and their hosts, and whether any are still used. | needs_review |
| 21 workflows with show, hide, reset, pause, refresh or set-state steps (listed in `app-spec.json`) | Those 31 steps were not opened. | The reader skips these action types. They may carry an "Only when" condition, and the set-state steps on index hold the demo role and demo email values. | info |
| All pages and the Nav reusable | Element-level conditionals (for example which Nav buttons each role sees) were not read, apart from Group App Settings on setup. | The reader reads data sources and workflows, not each element. Hiding a button is not a permission. | info |
| Pages defects and history, Text elements | Some Text elements contain their own searches or counts. | Text element expressions are not read; the counts will need the same filters as the lists next to them. | info |
| Page index, Video A | The video source was not read. | Media elements are outside what the reader reads. | info |
| Page setup, workflow `setup_open_help` | The link opened is whatever URL an admin saved in App Settings. | There is no fixed host to record, and no check that the saved value is a safe URL. | info |

## How this audit was made

The audit used five read-only tools of Bubble's MCP server: `list_apps` (1 call), `get_app_outline` (1), `get_app_plan_context` (1), `list_types` (1) and `get_node` (186: 6 data types, the backend root, 13 pages, views and reusables, 12 elements, 61 workflow events and 93 actions). Every call was a read, no records, logs or metrics were read, and no other app was opened. 18 further `get_node` attempts were refused by a rate limit and repeated successfully; they are not counted in the 190. The full structure, including the expression JSON behind every condition, is in `app-spec.json` next to this file.
