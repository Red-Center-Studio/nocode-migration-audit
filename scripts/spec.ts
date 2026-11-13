import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

export const schemaPath = fileURLToPath(new URL("../skills/audit/spec/app-spec.schema.json", import.meta.url));

export type Problem = { path: string; message: string };

type Named = { key: string };
type Spec = {
  entities: (Named & { fields: (Named & { type: string; ref?: string; enum?: string })[] })[];
  enums: Named[];
  roles: { detected: boolean; entity?: string; field?: string; enum?: string; values?: string[] };
  permissions: { entity: string; allows: { fields?: string[]; searchableFields?: string[]; autoSaveFields?: string[] } }[];
  pages: (Named & { workflows?: string[]; usesReusables?: string[]; dataShown?: string[]; guards?: { to?: string }[] })[];
  workflows: (Named & { page?: string; steps: { order: number; type: string; entity?: string; sets?: { field: string }[] }[] })[];
  integrations: { files?: { entity: string; field: string }[] };
};

let compiled: ReturnType<Ajv2020["compile"]> | undefined;

function validator() {
  if (!compiled) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    compiled = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
  }
  return compiled;
}

function duplicates(keys: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const k of keys) (seen.has(k) ? dup : seen).add(k);
  return [...dup];
}

/** Checks the JSON Schema, then the links between parts that a schema cannot express. */
export function validateSpec(spec: unknown): Problem[] {
  const validate = validator();
  if (!validate(spec)) {
    return (validate.errors ?? []).map((e) => ({ path: e.instancePath || "/", message: e.message ?? "invalid" }));
  }
  return checkReferences(spec as Spec);
}

export function checkReferences(spec: Spec): Problem[] {
  const problems: Problem[] = [];
  const add = (path: string, message: string) => problems.push({ path, message });

  const entities = new Map(spec.entities.map((e) => [e.key, new Set(e.fields.map((f) => f.key))]));
  const enums = new Set(spec.enums.map((e) => e.key));
  const pages = new Set(spec.pages.map((p) => p.key));
  const workflows = new Set(spec.workflows.map((w) => w.key));

  for (const [list, name] of [
    [spec.entities.map((e) => e.key), "entity"],
    [spec.enums.map((e) => e.key), "enum"],
    [spec.pages.map((p) => p.key), "page"],
    [spec.workflows.map((w) => w.key), "workflow"],
  ] as const) {
    for (const d of duplicates([...list])) add(`/${name}`, `duplicate ${name} key "${d}"`);
  }

  spec.entities.forEach((e, i) => {
    for (const d of duplicates(e.fields.map((f) => f.key))) add(`/entities/${i}`, `duplicate field "${d}" on ${e.key}`);
    e.fields.forEach((f, j) => {
      if (f.ref && !entities.has(f.ref)) add(`/entities/${i}/fields/${j}`, `unknown entity "${f.ref}"`);
      if (f.enum && !enums.has(f.enum)) add(`/entities/${i}/fields/${j}`, `unknown enum "${f.enum}"`);
    });
  });

  const r = spec.roles;
  if (r.detected) {
    if (!r.entity || !entities.has(r.entity)) add("/roles/entity", "roles detected but entity is missing or unknown");
    else if (!r.field || !entities.get(r.entity)!.has(r.field)) add("/roles/field", "roles detected but field is missing or unknown");
    if (r.enum && !enums.has(r.enum)) add("/roles/enum", `unknown enum "${r.enum}"`);
  }

  spec.permissions.forEach((p, i) => {
    const fields = entities.get(p.entity);
    if (!fields) return add(`/permissions/${i}`, `unknown entity "${p.entity}"`);
    for (const list of ["fields", "searchableFields", "autoSaveFields"] as const) {
      for (const f of p.allows[list] ?? []) if (!fields.has(f)) add(`/permissions/${i}/allows/${list}`, `unknown field "${f}" on ${p.entity}`);
    }
  });

  const userEntity = spec.entities.find((e) => (e as { isUser?: boolean }).isUser)?.key;

  spec.pages.forEach((p, i) => {
    for (const w of p.workflows ?? []) if (!workflows.has(w)) add(`/pages/${i}/workflows`, `unknown workflow "${w}"`);
    for (const u of p.usesReusables ?? []) if (!pages.has(u)) add(`/pages/${i}/usesReusables`, `unknown reusable "${u}"`);
    for (const d of p.dataShown ?? []) if (!entities.has(d)) add(`/pages/${i}/dataShown`, `unknown entity "${d}"`);
    for (const g of p.guards ?? []) if (g.to && !pages.has(g.to)) add(`/pages/${i}/guards`, `unknown page "${g.to}"`);
  });

  spec.workflows.forEach((w, i) => {
    if (w.page && !pages.has(w.page)) add(`/workflows/${i}/page`, `unknown page "${w.page}"`);
    w.steps.forEach((s, j) => {
      if (s.order !== j + 1) add(`/workflows/${i}/steps/${j}`, `steps must be numbered 1, 2, 3 in order (found ${s.order})`);
      if (s.entity && !entities.has(s.entity)) add(`/workflows/${i}/steps/${j}`, `unknown entity "${s.entity}"`);
      const target = s.entity ?? (s.type === "update_current_user" ? userEntity : undefined);
      const fields = target ? entities.get(target) : undefined;
      if (fields) {
        for (const set of s.sets ?? []) {
          if (!fields.has(set.field)) add(`/workflows/${i}/steps/${j}/sets`, `unknown field "${set.field}" on ${target}`);
        }
      }
    });
  });

  (spec.integrations.files ?? []).forEach((f, i) => {
    if (!entities.get(f.entity)?.has(f.field)) add(`/integrations/files/${i}`, `unknown field "${f.entity}.${f.field}"`);
  });

  return problems;
}
