---
name: audit
description: Read-only audit of a no-code app before porting it to code. Reads the app's structure (data types, option sets, privacy rules, pages, workflows, plugins) through the platform's official MCP and writes app-spec.json plus a plain-language audit.md with a complexity score, what maps cleanly, what needs work and what does not move. Use when the user asks to audit, assess, inventory or plan porting a no-code app (currently Bubble® apps) to their own code or to Cloudflare.
argument-hint: "[app-name]"
---

# No-code app audit

You are auditing one app the user owns, on their machine, with their own platform login. You read its structure and write two files. You never change the app and you never read its records.

Currently supported source: Bubble®, through Bubble's official MCP server. Other sources will be added as separate readers.

## Rules (apply for the whole run)

1. **Read only.** Use only these five MCP tools: `list_apps`, `get_app_outline`, `get_app_plan_context`, `list_types`, `get_node`. Never call any tool that creates, updates, deletes, applies, installs, uninstalls, uploads, restores, undoes, renames, moves, sets, assigns, detaches, initializes, branches or saves. If you are unsure whether a tool writes, do not call it.
2. **No records.** Never call `search_things`, `get_thing`, `get_app_data_context`, `query_logs`, `query_app_metrics` or any tool that returns user data, logs or metrics. The audit is about structure, not data.
3. **One app.** Audit only the app the user named. If they did not name one, call `list_apps`, show them the names, and ask which one. Never open any other app.
4. **Test version.** Read the development (`test`) version unless the user asks for another version by name.
5. **No secrets.** Do not copy API keys, tokens, passwords or full URLs with query strings into the output. For API calls record the host only. Workflow actions can contain credentials typed in as plain text (for example a demo account's email and password in a log-in action). Never copy those: write `[literal value omitted]` in their place and list the action under "Needs care" in the audit. This applies to email addresses, passwords, tokens and keys only; other typed-in values such as labels, default text and the app's own host name are part of the app's logic and are kept.
6. **No invented numbers.** Do not give hours, costs or savings. The complexity score is a comparison score, calculated exactly as `reference/audit-template.md` defines it.
7. **Say what you could not read.** Anything you could not resolve goes in `unknowns`, not into a guess.
8. If the MCP is not connected or a read fails, stop and tell the user what is missing. Do not try another route. A rate-limit reply ("rate limited; retry in 1s") is not a failure: wait as it says and repeat the same read. Send reads in batches of about 10 at a time to avoid it.

## Steps

1. **Pick the app.** Call `list_apps` once. If `$ARGUMENTS` names an app, find it there and take its canonical `appname` and its `displayName` (used as the report title). If no app was named, show the names and ask (rule 3).
2. **Read the app.** Follow `readers/bubble.md` step by step. Keep a running count of every MCP call you make by tool name. Count successful reads; count rate-limited attempts separately (rule 8) and report them as a separate number. Every call must be on the allowed list in rule 1. Reading takes roughly one call per data type, page, reusable, workflow and data-changing action, so the count grows with the app. In testing, an app with 6 data types, 11 pages and 61 workflows took 184 and 190 reads in two test runs. After the outline, tell the user how many pages, reusables, backend workflows and data types the app has, and that the read will take a while; carry on unless they say stop.
3. **Write `app-spec.json`.** It must match `spec/app-spec.schema.json` (spec version `0.1`). Set `source.reader` to `{"name": "nocode-migration-audit", "version": "0.1.2"}`, `source.appVersion` to the version you read (`test` unless the user chose another), and `source.writeCallsMade` to `0`. Before saving, check it yourself against the "Spec checklist" below.
4. **Write `audit.md`.** Follow `reference/audit-template.md` exactly, including the score table.
5. **Save both files** to `migration-audit/<app-name>/` in the current working directory (create the folder). Do not overwrite an existing audit without asking; if one exists, ask whether to replace it or write to a dated folder.
6. **Report back** in a few plain sentences: where the files are, the complexity band, the top three things that need work, the number of unknowns, and the number of MCP calls made (successful reads, all of them reads, with any rate-limited attempts given as a separate number).

A full schema check is available. The validator is at `scripts/validate.ts`, two folders above this skill's folder; that is the repo root in a clone and the plugin's install folder when the skill was installed as a plugin. If Node.js 22.18 or later is available and that folder has a `node_modules` folder, run `node <that folder>/scripts/validate.ts <full path to app-spec.json>` and report the result. If Node.js or `node_modules` is missing, tell the user they can run `npm install` in that folder and then the same command. Never run `npm install` yourself.

## Spec checklist

- Every `key` is snake_case and unique within its list. Field keys are unique within their entity.
- Every `reference` field has `ref` pointing at an entity key in the spec; every `enum` field has `enum` pointing at an enum key.
- Every permission rule names an existing entity, and every field it lists exists on that entity.
- Every page's `workflows`, `usesReusables`, `dataShown` and guard `to` point at keys that exist.
- Workflow steps are numbered 1, 2, 3 in order.
- Conditions and values keep both `text` (readable) and `source` (the expression JSON) whenever the platform returned JSON. A static value with no expression gets the value itself as `text` and no `source`; `text` is always a string, so booleans are `"true"` or `"false"` and numbers are written as strings. In `text`, elements are called by their real names from the element tree, not by the default names in the rendered text.
- Every trigger that has an element has `elementId` as well as `element`.
- Every field named in a step's `sets`, a rule's `searchableFields` or `autoSaveFields` exists on the right entity.
- No property outside the schema. No secrets, no record data, no personal data.
