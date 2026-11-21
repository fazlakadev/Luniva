import { randomBytes } from "node:crypto";
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
      `ALTER TABLE customers 
       ADD COLUMN IF NOT EXISTS address TEXT, 
       ADD COLUMN IF NOT EXISTS customer_code VARCHAR(32),
       ADD COLUMN IF NOT EXISTS email VARCHAR(255),
       ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
       ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
       ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
       ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`,
    );
    await db.query("ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL").catch(() => {});
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers(LOWER(email)) WHERE email IS NOT NULL;
       CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_google_id ON customers(google_id) WHERE google_id IS NOT NULL;`,
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
        display_name VARCHAR(120) NOT NULL DEFAULT 'منه',
        username VARCHAR(80),
        username_initialized BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(80)");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username_initialized BOOLEAN NOT NULL DEFAULT FALSE");
    await db.query("CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (LOWER(username))");
  });
}

const LEGACY_ADMIN_USERNAME = "منه";

export async function ensureInitialAdmin() {
  await ensureUsersTable();
  const username = (process.env.LUNIVA_ADMIN_USERNAME || "luniva").trim();
  const password = process.env.LUNIVA_ADMIN_PASSWORD;
  if (!username || !password) throw new Error("Admin credentials are not configured.");

  // The flag is set once, after the first migration. From then on the username
  // belongs to the account owner and settings can change it without login
  // ever resetting it back to the environment default.
  const initialized = await db.query("SELECT id FROM users WHERE username_initialized = TRUE LIMIT 1");
  if (initialized.rowCount) return;

  const [byUsername, legacyUsername] = await Promise.all([
    db.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [username]),
    db.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [LEGACY_ADMIN_USERNAME]),
  ]);

  // Migrate the old Arabic username in place. Only the login name changes:
  // the password hash and the display name used by the welcome dialog are preserved.
  const target = byUsername.rows[0] ?? legacyUsername.rows[0];
  if (target) {
    await db.query(
      "UPDATE users SET username = $1, username_initialized = TRUE WHERE id = $2",
      [username, target.id],
    );
    return;
  }

  // Existing installations already have an email-based admin. Promote that row
  // instead of creating a second account so the password keeps working.
  const legacyEmail = process.env.LUNIVA_ADMIN_EMAIL?.toLowerCase().trim();
  const candidates = [
    legacyEmail
      ? db.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [legacyEmail])
      : Promise.resolve({ rows: [] as Array<{ id: string }> }),
    db.query("SELECT id FROM users ORDER BY created_at LIMIT 1"),
  ];
  const found = await Promise.all(candidates);
  const existing = found[0].rows[0] ?? found[1].rows[0];
  if (existing) {
    await db.query(
      "UPDATE users SET username = $1, username_initialized = TRUE WHERE id = $2",
      [username, existing.id],
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (email, password_hash, display_name, username, username_initialized)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, username_initialized = TRUE`,
    ["admin@luniva.local", passwordHash, "منه", username],
  );
}

export function ensureSuppliersTable() {
  return runOnce("suppliers", async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(160) NOT NULL,
        contact_name VARCHAR(120),
        phone VARCHAR(32),
        email VARCHAR(160),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query("CREATE INDEX IF NOT EXISTS suppliers_name_idx ON suppliers (name)");
  });
}

export function ensureProductsTables() {
  return runOnce("products", async () => {
    await ensureSuppliersTable();
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
        ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS supply_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (supply_price >= 0),
        ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER NOT NULL DEFAULT 3
    `);
    await db.query("CREATE INDEX IF NOT EXISTS product_variants_supplier_idx ON product_variants (supplier_id)");
  });
}

export function ensureInventoryTables() {
  return runOnce("inventory", async () => {
    await ensureProductsTables();
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        change_qty INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        type VARCHAR(32) NOT NULL,
        reference_id VARCHAR(80),
        notes TEXT,
        created_by VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS inventory_transactions_variant_idx ON inventory_transactions (product_variant_id)"),
      db.query("CREATE INDEX IF NOT EXISTS inventory_transactions_product_idx ON inventory_transactions (product_id)"),
      db.query("CREATE INDEX IF NOT EXISTS inventory_transactions_created_at_idx ON inventory_transactions (created_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS inventory_transactions_type_idx ON inventory_transactions (type)"),
    ]);
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
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS supply_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (supply_price >= 0)
    `);
    await db.query("CREATE INDEX IF NOT EXISTS package_variants_supplier_idx ON package_variants (supplier_id)");
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
        delivery_status VARCHAR(24) NOT NULL DEFAULT 'preparing',
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
    await db.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS view_nonce VARCHAR(64)");
    await db.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(24) NOT NULL DEFAULT 'preparing'");
    await db.query(`
      ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL
    `);
    await db.query("CREATE INDEX IF NOT EXISTS invoice_items_supplier_idx ON invoice_items (supplier_id)");

    // Older invoices predate supply prices. Snapshot the current cost so profit
    // reports stay useful without rewriting any existing invoice totals.
    await db.query(`
      UPDATE invoice_items it
         SET unit_cost = COALESCE(pv.supply_price, 0), supplier_id = pv.supplier_id
        FROM product_variants pv
       WHERE it.product_variant_id = pv.id AND it.unit_cost = 0
    `);
    await db.query(`
      UPDATE invoice_items it
         SET unit_cost = COALESCE(gv.supply_price, 0), supplier_id = gv.supplier_id
        FROM package_variants gv
       WHERE it.package_variant_id = gv.id AND it.unit_cost = 0
    `);

    // Every invoice gets its own random nonce. It is only useful together with
    // the server secret, so the public share link cannot be derived from the DB.
    const missingNonce = await db.query("SELECT id FROM invoices WHERE view_nonce IS NULL");
    for (const row of missingNonce.rows) {
      await db.query(
        "UPDATE invoices SET view_nonce = $1 WHERE id = $2 AND view_nonce IS NULL",
        [randomBytes(24).toString("hex"), row.id],
      );
    }

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
        ('payment_terms_days', '7'),
        ('admin_email', '"fazlaka.dev@gmail.com"')
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
      db.query("CREATE INDEX IF NOT EXISTS invoices_delivery_status_idx ON invoices(delivery_status)"),
      db.query("CREATE INDEX IF NOT EXISTS invoices_due_idx ON invoices(due_date)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments(invoice_id)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_date_idx ON invoice_payments(paid_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS invoice_payments_receipt_idx ON invoice_payments(receipt_number)"),
      db.query("CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC)"),
    ]);
  });
}

/** Follow-up appointments, optionally tied to a customer and an invoice/payment. */
export function ensureAppointmentsTable() {
  return runOnce("appointments", async () => {
    await ensureInvoiceTables();
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(180) NOT NULL,
        notes TEXT,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(8),
        tone VARCHAR(16) NOT NULL DEFAULT 'accent',
        kind VARCHAR(24) NOT NULL DEFAULT 'followup',
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments (appointment_date, appointment_time)"),
      db.query("CREATE INDEX IF NOT EXISTS appointments_customer_idx ON appointments (customer_id)"),
      db.query("CREATE INDEX IF NOT EXISTS appointments_invoice_idx ON appointments (invoice_id)"),
      db.query("CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status)"),
    ]);
  });
}

export function ensureNotificationsTable() {
  return runOnce("notifications", async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(32) NOT NULL,
        type VARCHAR(40) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        read BOOLEAN NOT NULL DEFAULT FALSE,
        severity VARCHAR(16) NOT NULL DEFAULT 'info',
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read, created_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS notifications_category_idx ON notifications (category)"),
      db.query("CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC)"),
    ]);
  });
}

export function ensureWhatsAppTables() {
  return runOnce("whatsapp_tables", async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(32) NOT NULL,
        name VARCHAR(120) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(180),
        phone VARCHAR(40) NOT NULL,
        template_category VARCHAR(32),
        message TEXT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'sent',
        sent_by VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_sessions_backup (
        id VARCHAR(64) PRIMARY KEY,
        session_data JSONB,
        phone VARCHAR(50),
        push_name VARCHAR(150),
        connected_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        jid VARCHAR(120) UNIQUE NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(50),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        unread_count INT DEFAULT 0,
        last_message TEXT,
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        is_archived BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_jid VARCHAR(120) NOT NULL,
        message_id VARCHAR(120) UNIQUE NOT NULL,
        from_me BOOLEAN NOT NULL DEFAULT FALSE,
        sender_jid VARCHAR(120),
        sender_name VARCHAR(180),
        content TEXT NOT NULL,
        media_url TEXT,
        media_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'sent',
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_bot_settings (
        id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
        is_auto_reply_enabled BOOLEAN DEFAULT FALSE,
        welcome_message TEXT DEFAULT 'أهلاً بكِ في لونيفا (Luniva) للأزياء ✨ نسعد بخدمتك دائماً. سيتواصل معكِ أحد ممثلينا في أقرب وقت 💕',
        order_notification_enabled BOOLEAN DEFAULT TRUE,
        invoice_auto_send BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS whatsapp_logs_customer_idx ON whatsapp_logs (customer_id)"),
      db.query("CREATE INDEX IF NOT EXISTS whatsapp_logs_created_at_idx ON whatsapp_logs (created_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS whatsapp_templates_cat_idx ON whatsapp_templates (category)"),
      db.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_jid ON whatsapp_chats(jid)"),
      db.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_customer_id ON whatsapp_chats(customer_id)"),
      db.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_msg ON whatsapp_chats(last_message_at DESC)"),
      db.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_jid, created_at ASC)"),
      db.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id)"),
      db.query("INSERT INTO whatsapp_bot_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING"),
    ]);

    // Pre-seed default templates if empty
    const countCheck = await db.query("SELECT COUNT(*)::int AS count FROM whatsapp_templates");
    if (countCheck.rows[0].count === 0) {
      const defaultTemplates = [
        {
          category: "invoice",
          name: "إرسال فاتورة جديدة مع الرابط الإلكتروني",
          content: "مرحباً {اسم_العميلة} 💕\nيسعدنا ويشرفنا تعاملك مع لونيفا (Luniva) للأزياء.\nتم إصدار فاتورتك رقم {رقم_الفاتورة} بإجمالي {إجمالي_الفاتورة}.\n{حالة_السداد}\n\nيمكنكِ استعراض وتنزيل الفاتورة في أي وقت عبر الرابط الإلكتروني الآمن:\n{رابط_الفاتورة}\n\nشكراً لاختياركِ لونيفا ✨",
          is_default: true,
        },
        {
          category: "payment",
          name: "إيصال استلام دفعة سداد",
          content: "أهلاً بكِ {اسم_العميلة} 🌸\nتم تسجيل استلام دفعة مالية بقيمة {المبلغ_المدفوع} لصالح فاتورتك رقم {رقم_الفاتورة}.\nالمتبقي على الفاتورة: {المبلغ_المتبقي}.\n\nرابط متابعة الفاتورة وإيصالات السداد:\n{رابط_الفاتورة}\n\nشكراً لالتزامكِ وثقتكِ بنا 💕",
          is_default: true,
        },
        {
          category: "appointment",
          name: "تذكير بالموعد وجلسة القياس / البروفة",
          content: "مرحباً {اسم_العميلة} 🪡✨\nنود تذكيركِ بموعدكِ القادم لدى لونيفا ({موضوع_الموعد})\n📅 التاريخ: {تاريخ_الموعد}\n⏰ الساعة: {وقت_الموعد}\n\nيسعدنا ويشرفنا حضوركِ! للاعتذار أو تعديل الموعد يرجى مراسلتنا هنا 🌸",
          is_default: true,
        },
        {
          category: "overdue",
          name: "تذكير لطيف برصيد متبقي",
          content: "مرحباً {اسم_العميلة} 🤍\nنود تذكيركِ بلطف بوجود رصيد متبقي على فاتورتك رقم {رقم_الفاتورة} بقيمة {المبلغ_المتبقي}.\n\nيمكنكِ مراجعة الفاتورة عبر الرابط:\n{رابط_الفاتورة}\n\nشاكرين لكِ حسن تعاونكِ معنا 🌸",
          is_default: true,
        },
        {
          category: "marketing",
          name: "حملة تشكيلة وموديلات جديدة (New Collection)",
          content: "مرحباً {اسم_العميلة} ✨\nوصلت الآن تشكيلة جديدة ومميزة لدى لونيفا تناسب ذوقكِ الراقي! 💕\n\nتفضلي باستكشاف أحدث الموديلات والعروض عبر موقعنا:\n{رابط_المتجر}\n\nأو شرفينا بزيارة الفرع لتجربة القطع بنفسك 🌸",
          is_default: true,
        },
        {
          category: "winback",
          name: "عرض خاص واسترجاع عميلة غائبة (Win-Back)",
          content: "اشتقنا لكِ يا {اسم_العميلة} 💕\nيسعدنا تقديم كود خصم خاص لكِ: {كود_الخصم} عند زيارتكِ القادمة أو طلبكِ من لونيفا ✨\n\nتصفحي أحدث الموديلات هنا:\n{رابط_المتجر}\n\nيسعدنا دائماً أن تكوني جزءاً من عائلة لونيفا 🌸",
          is_default: true,
        },
      ];

      for (const t of defaultTemplates) {
        await db.query(
          `INSERT INTO whatsapp_templates (category, name, content, is_default)
           VALUES ($1, $2, $3, $4)`,
          [t.category, t.name, t.content, t.is_default],
        );
      }
    }
  });
}

export function ensureCustomerOrdersTable() {
  return runOnce("customer_orders", async () => {
    await ensureCustomersTable();
    await db.query(`
      CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

      CREATE TABLE IF NOT EXISTS customer_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(32) UNIQUE NOT NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(160) NOT NULL,
        customer_phone VARCHAR(32) NOT NULL,
        customer_email VARCHAR(255),
        customer_address TEXT,
        delivery_area VARCHAR(120),
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        notes TEXT,
        admin_notes TEXT,
        total_estimated NUMERIC(12, 2) NOT NULL DEFAULT 0,
        converted_invoice_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL DEFAULT 'product',
        item_id UUID,
        variant_id UUID,
        title VARCHAR(255) NOT NULL,
        sku VARCHAR(64),
        color VARCHAR(64),
        size VARCHAR(64),
        quantity INT NOT NULL DEFAULT 1,
        unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_created ON customer_orders(created_at DESC);
    `);
  });
}

export function ensureContactMessagesTable() {
  return runOnce("contact_messages", async () => {
    await ensureCustomersTable();
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        name VARCHAR(160) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32),
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'unread',
        reply_message TEXT,
        replied_at TIMESTAMPTZ,
        replied_by VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
    `);
  });
}
