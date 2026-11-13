import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateSpec } from "../scripts/spec.ts";

function minimal() {
  return {
    specVersion: "0.1",
    source: {
      platform: "bubble",
      app: "example-app",
      appVersion: "test",
      readAt: "2026-11-13T00:00:00Z",
      reader: { name: "nocode-migration-audit", version: "0.1.0" },
      writeCallsMade: 0,
    },
    entities: [
      {
        key: "user",
        name: "User",
        isUser: true,
        fields: [
          { key: "full_name", name: "Full Name", type: "text", list: false },
          { key: "role", name: "Role", type: "enum", enum: "role", list: false },
        ],
      },
      {
        key: "task",
        name: "Task",
        fields: [
          { key: "title", name: "Title", type: "text", list: false },
          { key: "owner", name: "Owner", type: "reference", ref: "user", list: false },
          { key: "file", name: "File", type: "file", list: false },
        ],
      },
    ],
    enums: [{ key: "role", name: "Role", values: [{ key: "admin", label: "Admin" }] }],
    roles: { detected: true, entity: "user", field: "role", enum: "role", values: ["admin"] },
    permissions: [
      {
        entity: "task",
        name: "Owners see their tasks",
        isDefault: false,
        condition: { text: "This Task's Owner is Current User" },
        allows: { view: true, fields: ["title", "owner"], search: true },
      },
      { entity: "task", name: "everyone", isDefault: true, allows: { view: false, search: false } },
    ],
    pages: [
      { key: "index", name: "index", kind: "page", route: "/" },
      {
        key: "tasks",
        name: "tasks",
        kind: "page",
        guards: [{ condition: { text: "Current User is logged out" }, effect: "redirect", to: "index" }],
        dataShown: ["task"],
        workflows: ["add_task"],
      },
    ],
    workflows: [
      {
        key: "add_task",
        name: "Add task",
        scope: "page",
        page: "tasks",
        trigger: { type: "button_click", element: "Button Add" },
        steps: [
          { order: 1, type: "create", entity: "task", sets: [{ field: "title", value: { text: "Input Title's value" } }] },
          { order: 2, type: "reset" },
        ],
      },
    ],
    integrations: { plugins: [], apiCalls: [], files: [{ entity: "task", field: "file", kind: "file" }] },
    unknowns: [],
  };
}

describe("app spec validation", () => {
  it("accepts a minimal valid spec", () => {
    expect(validateSpec(minimal())).toEqual([]);
  });

  it("rejects a wrong spec version", () => {
    const s = { ...minimal(), specVersion: "0.2" };
    expect(validateSpec(s).length).toBeGreaterThan(0);
  });

  it("rejects a spec that records write calls", () => {
    const s = minimal();
    s.source.writeCallsMade = 1;
    expect(validateSpec(s).length).toBeGreaterThan(0);
  });

  it("rejects unknown top-level properties", () => {
    expect(validateSpec({ ...minimal(), extra: true }).length).toBeGreaterThan(0);
  });

  it("requires ref on reference fields and enum on enum fields", () => {
    const s = minimal();
    delete (s.entities[1].fields[1] as { ref?: string }).ref;
    delete (s.entities[0].fields[1] as { enum?: string }).enum;
    expect(validateSpec(s).length).toBeGreaterThanOrEqual(2);
  });

  it("rejects bad keys", () => {
    const s = minimal();
    s.entities[1].key = "Task Item";
    expect(validateSpec(s).length).toBeGreaterThan(0);
  });

  it("catches references to entities, enums, pages and workflows that do not exist", () => {
    const s = minimal();
    (s.entities[1].fields[1] as { ref?: string }).ref = "account";
    s.permissions[0].allows.fields = ["title", "secret"];
    s.pages[1].workflows = ["missing_flow"];
    s.pages[1].guards![0].to = "login";
    s.workflows[0].steps[0].entity = "project";
    const messages = validateSpec(s).map((p) => p.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'unknown entity "account"',
        'unknown field "secret" on task',
        'unknown workflow "missing_flow"',
        'unknown page "login"',
        'unknown entity "project"',
      ]),
    );
  });

  it("catches duplicate keys and out-of-order steps", () => {
    const s = minimal();
    s.entities[1].fields.push({ key: "title", name: "Title again", type: "text", list: false });
    s.workflows[0].steps[1].order = 3;
    const messages = validateSpec(s).map((p) => p.message);
    expect(messages).toContain('duplicate field "title" on task');
    expect(messages.some((m) => m.startsWith("steps must be numbered"))).toBe(true);
  });

  it("catches unknown fields in step sets and in searchable fields", () => {
    const s = minimal();
    s.workflows[0].steps[0].sets!.push({ field: "titel", value: { text: "x" } });
    (s.permissions[0].allows as { searchableFields?: string[] }).searchableFields = ["owner", "colour"];
    const messages = validateSpec(s).map((p) => p.message);
    expect(messages).toContain('unknown field "titel" on task');
    expect(messages).toContain('unknown field "colour" on task');
  });

  it("accepts a cleared field and step inputs, and rejects a set with neither value nor clear", () => {
    const ok = minimal();
    const step = ok.workflows[0].steps[0] as Record<string, unknown>;
    (step.sets as object[]).push({ field: "owner", clear: true });
    step.inputs = [{ name: "Thing to change", value: { text: "Current cell's Task" } }];
    expect(validateSpec(ok)).toEqual([]);

    const bad = minimal();
    (bad.workflows[0].steps[0].sets as object[]).push({ field: "owner" });
    expect(validateSpec(bad).length).toBeGreaterThan(0);
  });

  it("accepts a trigger elementId and an enum key as a page state type, and rejects an elementId that is not a string", () => {
    const ok = minimal();
    (ok.workflows[0].trigger as Record<string, unknown>).elementId = "bTGMi";
    (ok.pages[1] as Record<string, unknown>).state = [{ name: "demo_role", type: "role", list: false }];
    expect(validateSpec(ok)).toEqual([]);

    const bad = minimal();
    (bad.workflows[0].trigger as Record<string, unknown>).elementId = 42;
    expect(validateSpec(bad).length).toBeGreaterThan(0);
  });

  it("catches roles that point at a missing field", () => {
    const s = minimal();
    s.roles.field = "access_level";
    expect(validateSpec(s).map((p) => p.message)).toContain("roles detected but field is missing or unknown");
  });
});

describe("example specs in examples/", () => {
  const dir = fileURLToPath(new URL("../examples/", import.meta.url));
  const apps = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(`${dir}${d}/app-spec.json`)) : [];

  it.each(apps)("%s/app-spec.json is valid", (app) => {
    const spec = JSON.parse(readFileSync(`${dir}${app}/app-spec.json`, "utf8"));
    expect(validateSpec(spec)).toEqual([]);
  });

  it.each(apps)("%s has an audit.md next to its spec", (app) => {
    expect(existsSync(`${dir}${app}/audit.md`)).toBe(true);
  });
});
