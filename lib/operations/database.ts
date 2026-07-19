const databaseSymbol = Symbol.for("notzero.operationalDatabase");

type DatabaseGlobal = typeof globalThis & { [databaseSymbol]?: D1Database | null };

export function setOperationalDatabase(database: D1Database | null | undefined) {
  (globalThis as DatabaseGlobal)[databaseSymbol] = database ?? null;
}

export function getOperationalDatabase() {
  return (globalThis as DatabaseGlobal)[databaseSymbol] ?? null;
}
