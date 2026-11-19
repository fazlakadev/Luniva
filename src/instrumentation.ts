/**
 * Warm the database schema once when the server boots. Running the DDL here
 * keeps the first page request fast; per-page `ensure*` calls remain as a
 * safety net and fall back to running the schema if this warmup fails.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureCustomersTable, ensureInvoiceTables, ensurePackagesTables, ensureSuppliersTable } = await import("./lib/db");
    await Promise.all([ensureCustomersTable(), ensureSuppliersTable(), ensurePackagesTables(), ensureInvoiceTables()]);
  } catch (error) {
    console.error("Database warmup failed; schema will be retried on first request.", error);
  }
}
