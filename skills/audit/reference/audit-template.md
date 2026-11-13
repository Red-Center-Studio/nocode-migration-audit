# audit.md template

Write `audit.md` in plain language for a founder who is not a developer. Short sentences, tables where they help, no emojis, no em dashes. Write "Bubble®" (with the registered mark) the first time the platform is named, and keep the wording factual: describe the app, not the platform. Do not give hours, costs or savings. Use the section headings below in this order.

---

## Template

```markdown
# App audit: <app display name>

<Two sentences. First: what the app is, in its own terms (for example "A fleet pre-start check app with three roles: admin, workshop and driver."). Second: the overall answer: how much of it maps cleanly to code and the one or two things that need the most care.>

| | |
| --- | --- |
| Source | <platform>, app `<appname>`, version `<appVersion>` |
| Read on | <date, UTC> |
| Reader | nocode-migration-audit <version> |
| MCP calls | <total> (all reads; 0 writes, 0 record reads) |
| Complexity | <score> (<band>) |

## What is in the app

| Part | Count |
| --- | --- |
| Data types | |
| Fields (excluding built-in) | |
| Option sets (options) | <n> (<total options>) |
| Privacy rules (excluding defaults) | |
| Pages / mobile views / reusables | |
| Workflows (page / reusable / backend) | |
| Workflow steps | |
| Plugins | |
| Unknowns | |

## Complexity score

<One sentence: this score compares apps with each other; it is not a time or cost estimate.>

| Item | Count | Points each | Points |
| --- | --- | --- | --- |
| ... one row per line of the scoring table below ... | | | |
| **Total** | | | **<score>** |

Band: <Small / Medium / Large>.

## What maps cleanly

<Bullets. Tie each to the destination: data types to database tables, option sets to fixed value lists, privacy rules to one server-side permission check, pages to routes, workflows to server handlers, file fields to file storage.>

## Who can do what

<A role matrix table: one row per action that matters (view each data type, create or change each data type, open each guarded page), one column per role plus "no role" and "signed out". Fill it from privacy rules (view and search) and from page guards and workflow conditions (create and change). Mark any cell you inferred rather than read with "(inferred)". Then one sentence: privacy rules cover viewing and searching; create and change rights come from page guards and workflow conditions, and the rebuild should enforce them on the server.>

## Needs care

<Numbered list, most important first. Each item: what it is, where it is (page or workflow), and why it needs care. Typical items: multi-step workflows that should become one server transaction; backend workflows that ignore privacy rules; pages with no guard; conditions where the rendered text and the JSON differ; scheduled or recurring workflows; plugins without a known replacement; API calls; anything in unknowns with severity needs_review or blocks_rebuild.>

## What does not move automatically

- User passwords: <platform> does not export them, so users reset their password at first login.
- Records: the audit does not read data. Data moves later through the platform's own CSV or JSON export, with row counts checked after import.
- API keys and secrets: re-enter them in the new app's secret store.
- Visual design: styles and layout are rebuilt, not copied.
- <Anything else specific to this app.>

## Before you switch over

<Short checklist specific to this app: sign-in and password reset, webhook or API URLs that point at the old app, old URLs that need redirects, file links, email sending, and how to switch back if something goes wrong.>

## Unknowns

<Table: where, what, why, severity. Or "None." if the list is empty.>

## How this audit was made

<Two or three sentences: which tools were called and how many times each, that every call was a read, that no records were read, and that the full structure is in app-spec.json next to this file.>
```

---

## Scoring table (version 0.1.1)

Count each item from the spec, multiply, and add up. Show the working in the "Complexity score" table. Round the total to the nearest whole number.

| Item | Points each |
| --- | --- |
| Data type | 2 |
| Field, excluding built-in fields | 0.5 |
| Option set | 1 |
| Privacy rule, excluding defaults | 2 |
| Page or mobile view (skip mobile views with no elements) | 3 |
| Reusable | 2 |
| Workflow (any scope) | 0.5 |
| Workflow step | 0.25 |
| Backend, scheduled or data-trigger workflow (extra, on top of the workflow points) | 3 |
| Plugin mapped `replaceable` | 2 |
| Plugin mapped `unknown` | 5 |
| API call | 3 |
| Unknown with severity `needs_review` | 2 |
| Unknown with severity `blocks_rebuild` | 5 |

Bands: **Small** under 75. **Medium** 75 to 200. **Large** over 200.

These weights are a first version, set so that apps can be compared with each other. They will be adjusted as more apps are audited, and the version number will change when they are. Do not convert the score or band into hours or money.
