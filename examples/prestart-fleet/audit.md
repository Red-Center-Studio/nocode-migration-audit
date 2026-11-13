# App audit: PreStart (prestart-fleet)

A fleet pre-start check app with three roles: admin, workshop and driver. Drivers submit daily vehicle checks, failed items become defects for the workshop, and admins manage vehicles, the checklist and the team. Most of it maps cleanly to code; the parts that need the most care are the check submit flow (five data changes that should become one server transaction) and who may change what, because the app enforces most write rights only through page redirects and button conditions.

| | |
| --- | --- |
| Source | Bubble®, app `prestart-fleet`, version `test` (the default; appVersion left unset) |
| Read on | 2026-11-13, 08:11 UTC |
| Reader | nocode-migration-audit 0.1.0 |
| MCP calls | 184 (all reads; 0 writes, 0 record reads) |
| Complexity | 157 (Medium) |

## What is in the app

| Part | Count |
| --- | --- |
| Data types | 6 |
| Fields (excluding built-in) | 37 |
| Option sets (options) | 4 (11) |
| Privacy rules (excluding defaults) | 8 |
| Pages / mobile views / reusables | 11 / 1 / 1 |
| Workflows (page / backend) | 60 / 1 (the 60 include 14 in the Nav reusable) |
| Workflow steps | 124 |
| Plugins | 1 (API Connector) |
| Unknowns | 5 (2 need review, 3 for information) |

## Complexity score

This score compares apps with each other; it is not a time or cost estimate.

| Item | Count | Points each | Points |
| --- | --- | --- | --- |
| Data type | 6 | 2 | 12 |
| Field, excluding built-in fields | 37 | 0.5 | 18.5 |
| Option set | 4 | 1 | 4 |
| Privacy rule, excluding defaults | 8 | 2 | 16 |
| Page or mobile view | 12 | 3 | 36 |
| Reusable | 1 | 2 | 2 |
| Workflow (any scope) | 61 | 0.5 | 30.5 |
| Workflow step | 124 | 0.25 | 31 |
| Backend, scheduled or data-trigger workflow (extra) | 1 | 3 | 3 |
| Plugin mapped `replaceable` | 0 | 2 | 0 |
| Plugin mapped `unknown` | 0 | 5 | 0 |
| API call | 0 | 3 | 0 |
| Unknown with severity `needs_review` | 2 | 2 | 4 |
| Unknown with severity `blocks_rebuild` | 0 | 5 | 0 |
| **Total** | | | **157** |

Band: Medium.

## What maps cleanly

- **Data types to database tables.** Six tables: users, app settings, checks, checklist items, defects and vehicles. Every field has a plain type (text, number, yes/no, date, image, or a link to another table).
- **Option sets to fixed value lists.** Role, severity, defect status and vehicle status become four small enums. None has extra attributes.
- **Privacy rules to one server-side permission check.** The rules follow one simple pattern: "has a role" for vehicles, defects and checklist items; "admin, or not a driver" plus "my own" for checks; "admin" plus "myself" for users. One permission function on the server covers all of them.
- **Pages to routes.** `/`, `/check`, `/defects`, `/fleet`, `/history`, `/setup`, `/account`, `/terms`, `/privacy` and `/404`. The top navigation (Nav) becomes one shared layout component. The empty native mobile view (Home) has nothing to carry over.
- **Workflows to server handlers.** Most workflows are one or two steps: save a vehicle, start work on a defect, change a team member's role, reorder a checklist item. Each becomes one small handler.
- **File fields to file storage.** Two image fields (check photo and defect photo) move to object storage.
- **Sign-in to an auth library.** Sign up, log in, log out, forgot password, reset password and change password are all standard Bubble actions with a direct equivalent in any auth library.

## Who can do what

| Action | Admin | Workshop | Driver | No role | Signed out |
| --- | --- | --- | --- | --- | --- |
| See users | All users | Only themselves | Only themselves | Only themselves | No (can search by role and demo flag, sees no fields) |
| See app settings | All fields | Business name and support email | Business name and support email | Business name and support email | Business name and support email |
| See checks | All | All | Only their own | No | No |
| See defects, vehicles, checklist items | Yes | Yes | Yes | No | No |
| Submit a check (creates check, may create defect, changes vehicle) | Yes | Yes | Yes | No | No |
| Start work on or mark a defect fixed | Yes | Yes | Yes (inferred: only the page guard limits it, and it lets drivers in) | No | No |
| Add or edit vehicles | Yes | Yes | No | No | No |
| Add, edit, reorder, switch off or delete checklist items | Yes | No | No | No | No |
| Edit app settings | Yes | No (inferred) | No (inferred) | No (inferred) | No |
| Change a team member's role | Yes | No (inferred) | No (inferred) | No (inferred) | No |
| Claim admin and wipe demo data | Only before a real admin exists, on the app's own domain (inferred) | Same | Same | Same | No |
| Open check, defects, history | Yes | Yes | Yes | No (sent home) | No (sent home) |
| Open fleet | Yes | Yes | No (sent home) | No (sent home) | No (sent home) |
| Open setup | Yes | Only before a real admin exists, on the app's own domain | Same | Same | No (sent home) |
| Open account | Yes | Yes | Yes | Yes | No (sent home) |

Privacy rules cover viewing and searching; create and change rights come from page guards and workflow conditions, and the rebuild should enforce them on the server. Cells marked "(inferred)" rely on the setup page guard alone, because those workflows have no role condition of their own.

## Needs care

1. **Check submit is five data changes in one browser workflow.** On the check page, "Submit pre-start check" creates a check, marks it passed or failed, creates a defect when items failed, updates the vehicle's odometer and takes the vehicle off the road for a critical defect. If the browser stops halfway, the data is left half-written. The rebuild should do this as one server transaction, with tests.
2. **Most write rights are only enforced by page redirects.** The defects page buttons, the fleet save button, the business details buttons and the team role buttons on setup have no role condition of their own. In particular, the defects page lets drivers in, so a driver can mark a defect fixed and put a vehicle back in service. In the rebuild every handler must check the role on the server. Decide whether drivers should be able to change defects at all.
3. **"Mark fixed" always puts the vehicle back in service.** On the defects page, "Mark defect fixed and return vehicle to service" sets the vehicle to In service without checking for other open critical defects on the same vehicle.
4. **A critical severity can take a vehicle off the road with no defect.** In check submit, the "off road" step only checks the severity dropdown, while the defect is only created when an item failed. A driver who ticks every item but picks Critical takes the vehicle off the road with no defect in the queue to fix it.
5. **The backend workflow ignores privacy rules and deletes in bulk.** `wipe_demo_data` runs with privacy rules switched off and deletes every defect, check and vehicle (demo or not) and every demo user. It is started by "Claim admin and wipe demo data" on the setup page. The rebuild needs this as an explicit, admin-only, one-time server action, or as a seed reset that is not shipped to production.
6. **First-admin and demo logic depends on the Bubble address.** About a dozen conditions test whether the site runs on `prestart-fleet.bubbleapps.io` to switch demo mode on or off (demo buttons, demo sign-up, first sign-up becomes admin, claim admin, name and password changes, logging out demo users). The rebuild should replace this with an explicit setting or environment flag and a clear first-admin flow.
7. **Hard-coded demo password in workflows.** The three "Demo as" buttons on the home page, and their sign-up fallbacks, contain a plain-text password in the workflow. It is not copied into this audit or the spec. Treat it as exposed: do not reuse it, and do not carry demo log-in into a production build.
8. **Rendered text and JSON disagree in several places.** The setup guard, the claim button, the first-sign-up admin step and the "send to setup" login event all show "Search for Users:count - Search for Users:count", which reads as zero; in the JSON it is "all admins minus demo admins". The wipe step renders as "Search for Users" but only deletes demo users. The history list renders as "Search for Checks" but filters by vehicle and dates. The checklist reorder math renders as "a + b / 2" but computes (a + b) / 2. The spec keeps the JSON for each of these.
9. **Anyone can search users by role and demo flag.** The default user privacy rule lets everyone, including signed-out visitors, search users by role and demo flag (they see no fields). The app uses this to count admins. In the rebuild, do this count on the server and do not expose it.
10. **An admin can remove their own access.** "Remove access" on the setup team list clears the role of any user in the list, including the admin clicking it. If the only admin does this, nobody can manage the app. Add a guard in the rebuild.
11. **Defects are not linked to the check that raised them.** The check's failed items are copied into the defect description as text, and checks and defects store copies of the driver and vehicle names. Decide whether the rebuild keeps these copies or links the records.
12. **Two items need a person to look** (see Unknowns): whether the API Connector has any calls defined, and whether user email addresses are visible to admins.

## What does not move automatically

- User passwords: Bubble does not export them, so users reset their password at first login.
- Records: the audit does not read data. Data moves later through the platform's own CSV or JSON export, with row counts checked after import.
- API keys and secrets: re-enter them in the new app's secret store.
- Visual design: styles and layout are rebuilt, not copied. The app has 75 styles in its style list; none are carried over.
- Bubble's own password reset page (`reset_pw`) and password reset email: the new auth library provides both.
- Demo mode: the demo accounts, "Demo as" buttons and the bubbleapps.io checks are specific to the Bubble template and should be redesigned, not copied.
- The native mobile view "Home": it is empty in Bubble, so there is nothing to move.

## Before you switch over

- Sign-in: confirm every user can sign in with a password reset at first login, and that each user's role came across. A user with no role sees almost nothing.
- First admin: make sure at least one real admin exists in the new app before go-live, and that the claim and wipe flow is not reachable in production.
- Password reset: test the forgot-password email from the new app and point its link at the new reset page.
- Old URLs: redirect `/check`, `/defects`, `/fleet`, `/history`, `/setup`, `/account`, `/terms`, `/privacy` and `/reset_pw` from the old address to the new routes.
- Photos: check that check and defect photos still open after the file move, since Bubble file links will stop working if the old app is closed.
- API Connector: confirm in the Bubble editor's Plugins tab that no calls exist, or list them for the rebuild.
- Switching back: keep the Bubble app running and read-only for a set period, so you can switch the domain back if something goes wrong.

## Unknowns

| Where | What | Why | Severity |
| --- | --- | --- | --- |
| Integrations / API Connector | Plugin installed; call list and hosts cannot be read. No workflow uses an API call. | The allowed tools do not expose API Connector definitions. Check the editor's Plugins tab. | needs_review |
| Permissions / user | No user privacy rule lists the built-in email field, even the admin rule. | Unclear whether the MCP leaves email out or email is really hidden. This decides who may see email addresses. | needs_review |
| Pages / check, history | Data sources of the vehicle and severity dropdowns were not read. | The reader only reads repeating groups. Not known whether off-road vehicles are hidden from drivers. | info |
| Pages / setup | Data source of the App Settings group was not read. | Not a repeating group. Assumed to be the single settings record. | info |
| Workflows / several | Properties of simple set-state, show, hide, reset and plain navigation actions were not read. | The reader allows skipping them, so any "Only when" condition on them is not recorded. | info |

## How this audit was made

The audit called Bubble's MCP 184 times: `get_app_outline` once, `get_app_plan_context` once, `list_types` once and `get_node` 181 times (`list_apps` was not needed because the app name was given). Every call was a read; no records, logs or metrics were read and nothing in the app was changed. The full structure is in `app-spec.json` next to this file.
