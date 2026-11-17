import { Pool } from "pg";
import bcrypt from "bcryptjs";

declare global {
  var lunivaPool: Pool | undefined;
  var lunivaInitTasks: Map<string, Promise<void>> | undefined;
}

export const db =
  global.lunivaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

global.lunivaPool = db;

/**
 * Schema setup only needs to run once per server process. Without this cache
 * every page navigation re-ran dozens of DDL statements against the database,
 * which made moving between pages extremely slow.
 *
 * The cache lives on globalThis so it also survives dev hot reloads.
 */
const initTasks = global.lunivaInitTasks ?? new Map<string, Promise<void>>();
global.lunivaInitTasks = initTasks;

function runOnce(key: string, task: () => Promise<void>) {
  const existing = initTasks.get(key);
  if (existing) return existing;

  const promise = task().catch((error) => {
    initTasks.delete(key);
    throw error;
  });
  initTasks.set(key, promise);
  return promise;
}

export function ensureCustomersTable() {
  return runOnce("customers", async () => {
    await Promise.all([
      db.query("CREATE SEQUENCE IF NOT EXISTS customers_code_seq START 1001"),
      db.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name VARCHAR(160) NOT NULL,
          phone VARCHAR(32) NOT NULL,
          customer_code VARCHAR(32) UNIQUE,
          address TEXT,
          image_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
    ]);
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_phones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        phone VARCHAR(32) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS customer_code VARCHAR(32)",
    );
    await db.query(
      "INSERT INTO customer_phones (customer_id, phone) SELECT id, phone FROM customers ON CONFLICT (phone) DO NOTHING",
    );
  });
}

export function ensureUsersTable() {
  return runOnce("users", async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(254) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(120) NOT NULL DEFAULT 'Luniva Admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });
}

export async function ensureInitialAdmin() {
  await ensureUsersTable();
  const email = process.env.LUNIVA_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.LUNIVA_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Admin credentials are not configured.");

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
    [email, passwordHash, "Luniva Admin"],
  );
}

export function ensureProductsTables() {
  return runOnce("products", async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(180) NOT NULL,
        primary_sku VARCHAR(80) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          color VARCHAR(80) NOT NULL,
          size VARCHAR(40) NOT NULL,
          sku VARCHAR(80) UNIQUE NOT NULL,
          price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
          price_before_discount NUMERIC(12,2),
          discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
          discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
          image_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(product_id, color, size)
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS product_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
    ]);
    await db.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS price_before_discount NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS price_after_discount NUMERIC(12,2)
    `);
    await db.query(`
      ALTER TABLE product_variants
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS price_before_discount NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
        ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) NOT NULL DEFAULT 0
    `);
  });
}

export function ensurePackagesTables() {
  return runOnce("packages", async () => {
    await ensureProductsTables();
    await db.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(180) NOT NULL,
        primary_sku VARCHAR(80) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        price_before_discount NUMERIC(12,2) NOT NULL CHECK (price_before_discount >= 0),
        price_after_discount NUMERIC(12,2) NOT NULL CHECK (price_after_discount >= 0),
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        badge VARCHAR(60),
        discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
        discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`
      ALTER TABLE packages
        ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS badge VARCHAR(60),
        ADD COLUMN IF NOT EXISTS discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
        ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) NOT NULL DEFAULT 0
    `);
    await Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS package_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id),
          variant_id UUID REFERENCES product_variants(id),
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
          sort_order INTEGER NOT NULL DEFAULT 0
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS package_variants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          name VARCHAR(120) NOT NULL,
          sku VARCHAR(80) UNIQUE NOT NULL,
          price_before_discount NUMERIC(12,2) NOT NULL CHECK (price_before_discount >= 0),
          price_after_discount NUMERIC(12,2) NOT NULL CHECK (price_after_discount >= 0),
          image_url TEXT,
          stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
          discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
    ]);
    await db.query(
      "ALTER TABLE package_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0",
    );
    await db.query(`
      ALTER TABLE package_variants
        ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
        ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS package_variant_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        package_variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
        package_item_id UUID NOT NULL REFERENCES package_items(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        product_variant_id UUID NOT NULL REFERENCES product_variants(id),
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(package_variant_id, package_item_id)
      )
    `);
    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS package_variant_items_variant_idx ON package_variant_items(package_variant_id)"),
      db.query("CREATE INDEX IF NOT EXISTS package_variants_package_idx ON package_variants(package_id)"),
      db.query("CREATE INDEX IF NOT EXISTS package_items_package_idx ON package_items(package_id)"),
    ]);
  });
}

export function ensureInvoiceTables() {
  return runOnce("invoices", async () => {
    await ensureCustomersTable();
    await ensurePackagesTables();

    await db.query(`
      CREATE SEQUENCE IF NOT EXISTS invoices_number_seq START 1001
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(32) UNIQUE NOT NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(160) NOT NULL,
        customer_phone VARCHAR(32),
        customer_address TEXT,
        delivery_area VARCHAR(120),
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
        discount_type VARCHAR(16) NOT NULL DEFAULT 'amount',
        discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
        discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
        delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
        total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
        paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
        status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
        payment_method VARCHAR(16) NOT NULL DEFAULT 'cash',
        notes TEXT,
        due_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        item_type VARCHAR(16) NOT NULL DEFAULT 'product',
        product_id UUID,
        product_variant_id UUID,
        package_id UUID,
        package_variant_id UUID,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        sku VARCHAR(80),
        image_url TEXT,
        unit_before NUMERIC(12,2) NOT NULL DEFAULT 0,
        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        line_before NUMERIC(12,2) NOT NULL DEFAULT 0,
        line_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Existing databases predate these columns/tables; keep upgrades automatic.
    await db.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE");

    await db.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_receipts_number_seq START 1
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_number VARCHAR(32) UNIQUE NOT NULL,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(16) NOT NULL DEFAULT 'cash',
        reference VARCHAR(120),
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes TEXT,
        recorded_by VARCHAR(160),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Carry old single-value payments into the new ledger so balances stay correct.
    await db.query(`
      INSERT INTO invoice_payments
        (receipt_number, invoice_id, amount, payment_method, paid_at, notes, recorded_by)
      SELECT 'RCP-' || LPAD(nextval('invoice_receipts_number_seq')::text, 4, '0'),
             i.id, i.paid_amount, i.payment_method, i.updated_at,
             'دفعة مرحّلة من سجل الفواتير السابق', 'system'
      FROM invoices i
      WHERE i.paid_amount > 0
        AND NOT EXISTS (SELECT 1 FROM invoice_payments p WHERE p.invoice_id = i.id)
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(64) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '""'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      INSERT INTO app_settings (key, value) VALUES
        ('company_name', '"Luniva"'),
        ('company_tagline', '"لإدارة المنتجات والبكدجات والفواتير"'),
        ('company_phone', '""'),
        ('company_address', '""'),
        ('tax_number', '""'),
        ('receipt_footer', '"شكرًا لتعاملك معنا"'),
        ('payment_terms_days', '7')
      ON CONFLICT (key) DO NOTHING
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(32) NOT NULL,
        entity_id VARCHAR(64),
        action VARCHAR(48) NOT NULL,
        summary TEXT NOT NULL,
        actor VARCHAR(160),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items(invoice_id)"),
      db.query("CREATE INDEX IF NOT EXISTS invoices_created_idx ON invoices(created_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices(customer_id)"),
      db.query("CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status)"),
      db.query("CREATE INDEX IF NOT EXISTS invoices_due_idx ON invoices(due_date)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments(invoice_id)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_date_idx ON invoice_payments(paid_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_receipt_idx ON invoice_payments(receipt_number)"),
      db.query("CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC)"),
    ]);
  });
}
