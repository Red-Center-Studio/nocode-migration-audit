# No-code app audit

A free, read-only audit skill for Claude Code, from [Red Center Studio](https://redcenterstudio.com). Point it at an app you built on a no-code platform and it writes two files:

- **`audit.md`**: a plain-language report. What is in the app, a complexity score, who can do what, what maps cleanly to code, what needs care, and what does not move automatically.
- **`app-spec.json`**: the app's structure in neutral terms (data, option lists, permissions, pages, workflows, integrations), checked against a published [JSON Schema](skills/audit/spec/app-spec.schema.json). Any developer or tool can build from it.

Supported source today: Bubble®, through Bubble's official MCP server. Support for other platforms will be added one reader at a time, and this page will say which ones are supported.

## What it reads, and what it never does

- It reads the app's **structure** only: data types and fields, option sets, privacy rules, pages, workflows and plugins.
- It **never changes your app**. The skill allows five read tools and nothing else.
- It **never reads your records** (no user data, logs or metrics).
- It runs **on your machine with your own login**. Nothing is sent to Red Center Studio.
- It does not give hours, prices or savings. The complexity score compares apps; it is not an estimate.

## Install (four steps)

You need [Claude Code](https://code.claude.com/docs) and an app you own or collaborate on.

1. Connect Bubble's MCP server to Claude Code by following [Bubble's MCP guide](https://bubble.io/support/en/articles/17351301-bubble-mcp).
2. In Claude Code, add this repo as a plugin marketplace:
   ```
   /plugin marketplace add Red-Center-Studio/nocode-migration-audit
   ```
3. Install the plugin:
   ```
   /plugin install nocode-migration-audit@nocode-migration-audit
   ```
4. Run the audit, with your app's name from the editor URL (`bubble.io/page?id=<app-name>`):
   ```
   /nocode-migration-audit:audit your-app-name
   ```

The files land in `migration-audit/<app-name>/` in the folder you ran Claude Code from.

Prefer not to use the plugin system? Copy the `skills/audit` folder to `~/.claude/skills/audit` (on Windows, `%USERPROFILE%\.claude\skills\audit`) and run `/audit your-app-name`.

### Optional: make Claude Code refuse write tools

The skill already limits itself to read tools. For a second lock, add these rules to `~/.claude/settings.json` (or the project's `.claude/settings.json`). Claude Code will then refuse Bubble MCP tools that change an app or read records, whatever any prompt says. If you named the MCP server something other than `bubble`, change the prefix.

```json
{
  "permissions": {
    "deny": [
      "mcp__bubble__create_*",
      "mcp__bubble__update_*",
      "mcp__bubble__delete_*",
      "mcp__bubble__modify_*",
      "mcp__bubble__set_*",
      "mcp__bubble__restore_*",
      "mcp__bubble__reorder_*",
      "mcp__bubble__upload_*",
      "mcp__bubble__apply_changes",
      "mcp__bubble__bulk_create_things",
      "mcp__bubble__install_plugin",
      "mcp__bubble__uninstall_plugin",
      "mcp__bubble__undo",
      "mcp__bubble__rename_node",
      "mcp__bubble__move_element",
      "mcp__bubble__assign_style",
      "mcp__bubble__detach_style",
      "mcp__bubble__change_workflow_item_type",
      "mcp__bubble__initialize_api_call",
      "mcp__bubble__acknowledge_undo_recovery",
      "mcp__bubble__search_things",
      "mcp__bubble__get_thing",
      "mcp__bubble__get_app_data_context",
      "mcp__bubble__query_logs",
      "mcp__bubble__query_app_metrics"
    ]
  }
}
```

Remove these rules when you want Claude to build or edit Bubble apps again.

## Example

[`examples/prestart-fleet/`](examples/prestart-fleet/) is a real run on PreStart, a fleet pre-start check app with three roles. Its code rebuild is public as [PreStart Lite](https://github.com/Red-Center-Studio/prestart-lite), so you can compare the audit with the app that was built from it.

## What the audit does not do

- It does not move data, passwords, API keys or visual design. The report lists each of these for your app.
- It cannot open API Connector call definitions with read-only tools. It lists the calls it sees used in workflows and asks you to check the rest in the editor.
- It is tested against the platform's MCP as it was on the date in each reader file. Platforms change; if output looks wrong, open an issue with the reader date and what you saw.

## Want the move done automatically or by the studio?

The report and the app spec are yours to use with any developer. If you would rather move automatically with verified code in your own Cloudflare account, or have the studio run the build for you:

- [App Mover](https://redcenterstudio.com/app-mover/): builds and deploys your full UI, Workers backend, D1 database, and R2 files into your own Cloudflare account, starting with a free interactive 10-page preview.
- [Data Migrator](https://redcenterstudio.com/app-mover/?tab=data#run): moves your Bubble® schema, records, R2 files, privacy rules, and 301 redirects with a free 1,000-record trial.
- [Website and app migrations](https://redcenterstudio.com/services/website-migrations/) & [Project Blueprint](https://redcenterstudio.com/services/project-blueprint/): done-for-you migrations from `$499 USD` and scoped architecture blueprints.
- Step-by-step guide: [How to audit your Bubble app before migrating](https://redcenterstudio.com/knowledge-base/audit-bubble-app-before-migrating/).

### How it works / what it costs / what you own

- **Free audit (this repo)**: read-only structural audit (`audit.md` + `app-spec.json`), zero write tools, runs locally.
- **Data Migrator (USD)**: free 1,000-record / 250 MB / 7-day trial; 30-day passes `$39` Starter (10k records), `$69` Migration (100k records), `$199` Large (500k records).
- **App Mover (USD)**: Small `$159` (up to 10 pages), Standard `$299` (up to 30 pages), Large `$389` (up to 80 pages; 81 to 250 add `$3`/page; over 250 custom quote), Developer mode `$45` (includes matching data pass, 2 rebuild rounds, and 30-day fix window).
- **What you own**: TypeScript, React, Hono, and Drizzle code running in your own Cloudflare account, plus this MIT-licensed open-source audit skill.
- **Security & contact**: Report vulnerabilities or questions to `hello@redcenterstudio.com`.

## For developers

The spec schema has its own tests. With Node.js 22.18 or later:

```
npm install
npm test
npm run validate -- path/to/app-spec.json
```

Layout:

| Path | What it is |
| --- | --- |
| `skills/audit/SKILL.md` | The skill: rules and steps |
| `skills/audit/readers/` | One reader per source platform |
| `skills/audit/reference/audit-template.md` | Report template and the scoring table |
| `skills/audit/spec/app-spec.schema.json` | App spec schema, version 0.1 |
| `scripts/` | Spec validator (schema plus cross-references) |
| `examples/` | Real audit output |
| `docs/test-runs.md` | Every test run, what went wrong and what changed |

## Licence

MIT. See [LICENSE](LICENSE).

Bubble® is a trademark of Bubble Group, Inc. Red Center Studio is not affiliated with Bubble. Cloudflare, Anthropic and Claude are trademarks of their respective owners; platform names are used only to describe the technology this project works with.
