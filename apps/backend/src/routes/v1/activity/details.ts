export type ActivityChange = {
  from: unknown;
  to: unknown;
};

export function getActivityChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[],
) {
  const changes: Record<string, ActivityChange> = {};

  for (const field of fields) {
    const from = before[field];
    const to = after[field];

    if (Object.is(from, to) || JSON.stringify(from) === JSON.stringify(to)) {
      continue;
    }

    changes[field] = { from, to };
  }

  return changes;
}

export function pickInitialActivityValues(values: Record<string, unknown>) {
  const defaults: Record<string, unknown> = {
    status: "planned",
    progress: 0,
    favorite: false,
    visibility: "private",
  };

  return Object.fromEntries(
    Object.entries(values).filter(([field, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return !Object.is(defaults[field], value);
    }),
  );
}
