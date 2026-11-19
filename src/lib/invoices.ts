import type { PoolClient } from "pg";
import { canonicalColorName } from "@/lib/colors";
import { db, ensureInvoiceTables } from "@/lib/db";
import {
  applyDiscount,
  DISCOUNT_TYPES,
  roundMoney,
  type DiscountType,
} from "@/lib/packages";
import {
  PAYMENT_METHODS,
  deliveryStatusLabels,
  deriveInvoiceStatus,
  normalizeDeliveryStatus,
  type DeliveryStatus,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoice-shared";
import { nextReceiptNumber } from "@/lib/payments";
import { newViewNonce } from "@/lib/invoice-view";
import { getSettings } from "@/lib/settings";
import { logActivity } from "@/lib/activity";

export {
  INVOICE_STATUSES,
  invoiceStatusLabels,
  PAYMENT_METHODS,
  paymentMethodLabels,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoice-shared";

const CASH_CUSTOMER = "عميلة نقدية";
const MAX_ITEMS = 80;

export type InvoiceItemInput = {
  type: "product" | "package";
  variantId: string | null;
  packageVariantId: string | null;
  quantity: number;
};

export type InvoiceInput = {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryArea: string;
  deliveryFee: number;
  discountType: DiscountType;
  discountValue: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  dueDate: string | null;
  items: InvoiceItemInput[];
};

export type ResolvedInvoiceItem = {
  itemType: "product" | "package";
  productId: string | null;
  productVariantId: string | null;
  packageId: string | null;
  packageVariantId: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitBefore: number;
  unitPrice: number;
  unitCost: number;
  supplierId: string | null;
  quantity: number;
  lineBefore: number;
  lineTotal: number;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function buildInvoiceTotals(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
  deliveryFee: number,
) {
  const safeSubtotal = roundMoney(Math.max(0, subtotal));
  const safeDelivery = roundMoney(Math.max(0, deliveryFee));
  const afterDiscount = applyDiscount(safeSubtotal, discountType, discountValue);
  const discountAmount = roundMoney(Math.max(0, safeSubtotal - afterDiscount));
  const total = roundMoney(afterDiscount + safeDelivery);
  return { subtotal: safeSubtotal, discountAmount, total, deliveryFee: safeDelivery };
}

export function normalizeInvoicePayload(raw: unknown): InvoiceInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const customerName = readString(body.customerName) || CASH_CUSTOMER;
  const customerPhone = readString(body.customerPhone);
  const customerAddress = readString(body.customerAddress);
  const deliveryArea = readString(body.deliveryArea);
  const notes = readString(body.notes);
  const customerIdRaw = readString(body.customerId);
  const customerId = customerIdRaw && isUuid(customerIdRaw) ? customerIdRaw : null;

  if (customerName.length > 160) throw new Error("اسم العميلة طويل جدًا.");
  if (customerPhone.length > 32) throw new Error("رقم الهاتف غير صحيح.");
  if (customerAddress.length > 500) throw new Error("العنوان طويل جدًا.");
  if (deliveryArea.length > 120) throw new Error("اسم منطقة التوصيل طويل جدًا.");
  if (notes.length > 1000) throw new Error("الملاحظات طويلة جدًا.");

  const deliveryFee = roundMoney(Math.max(0, asNumber(body.deliveryFee, 0)));
  if (deliveryFee > 1_000_000) throw new Error("قيمة التوصيل كبيرة جدًا.");

  const discountType = DISCOUNT_TYPES.includes(body.discountType as DiscountType)
    ? (body.discountType as DiscountType)
    : "amount";
  const discountValue = roundMoney(Math.max(0, asNumber(body.discountValue, 0)));
  if (discountType === "percent" && discountValue > 100) throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");

  const paidAmount = roundMoney(Math.max(0, asNumber(body.paidAmount, 0)));
  if (paidAmount > 100_000_000) throw new Error("المبلغ المدفوع كبير جدًا.");

  const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod as PaymentMethod)
    ? (body.paymentMethod as PaymentMethod)
    : "cash";

  let dueDate: string | null = null;
  const dueDateRaw = readString(body.dueDate);
  if (dueDateRaw) {
    const parsed = new Date(dueDateRaw);
    if (Number.isNaN(parsed.getTime())) throw new Error("تاريخ الاستحقاق غير صحيح.");
    dueDate = parsed.toISOString().slice(0, 10);
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    throw new Error("أضيفي منتجًا أو بكدجًا واحدًا على الأقل إلى الفاتورة.");
  }

  const seen = new Set<string>();
  const items = body.items.map((entry): InvoiceItemInput => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const type = item.type === "package" ? "package" : "product";
    const quantity = Math.trunc(asNumber(item.quantity, 1));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new Error("كمية كل عنصر يجب أن تكون بين 1 و999.");
    }

    if (type === "package") {
      const packageVariantId = readString(item.packageVariantId);
      if (!isUuid(packageVariantId)) throw new Error("اختاري بكدجًا صحيحًا لكل عنصر.");
      if (seen.has(`p:${packageVariantId}`)) throw new Error("لا يمكن تكرار نفس البكدج في الفاتورة. عدّلي الكمية بدلًا من ذلك.");
      seen.add(`p:${packageVariantId}`);
      return { type, variantId: null, packageVariantId, quantity };
    }

    const variantId = readString(item.variantId);
    if (!isUuid(variantId)) throw new Error("اختاري متغير منتج صحيحًا لكل عنصر.");
    if (seen.has(`v:${variantId}`)) throw new Error("لا يمكن تكرار نفس المتغير في الفاتورة. عدّلي الكمية بدلًا من ذلك.");
    seen.add(`v:${variantId}`);
    return { type, variantId, packageVariantId: null, quantity };
  });

  return {
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    deliveryArea,
    deliveryFee,
    discountType,
    discountValue,
    paidAmount,
    paymentMethod,
    notes,
    dueDate,
    items,
  };
}

export async function resolveInvoiceItems(items: InvoiceItemInput[]): Promise<ResolvedInvoiceItem[]> {
  const variantIds = items.filter((item) => item.type === "product").map((item) => item.variantId!);
  const packageVariantIds = items.filter((item) => item.type === "package").map((item) => item.packageVariantId!);

  const [productRows, packageRows] = await Promise.all([
    variantIds.length
      ? db.query(
          `SELECT v.id AS variant_id, v.product_id, v.color, v.size, v.sku,
                  v.price, v.price_before_discount, v.image_url, p.name AS product_name, v.supply_price, v.supplier_id
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
           WHERE v.id = ANY($1::uuid[])`,
          [variantIds],
        )
      : Promise.resolve({ rows: [] as Array<Record<string, unknown>> }),
    packageVariantIds.length
      ? db.query(
          `SELECT v.id AS package_variant_id, v.package_id, v.name AS variant_name, v.sku,
                  v.price_after_discount, v.price_before_discount, v.image_url, p.name AS package_name,
                   v.supply_price, v.supplier_id,
                   COALESCE((SELECT SUM(s.quantity * COALESCE(pv.supply_price, 0))
                     FROM package_variant_items s
                     JOIN product_variants pv ON pv.id = s.product_variant_id
                     WHERE s.package_variant_id = v.id), 0) AS components_cost,
                  COALESCE((
                    SELECT json_agg(json_build_object(
                      'productName', pr.name,
                      'color', pv.color,
                      'size', pv.size,
                      'quantity', s.quantity
                    ) ORDER BY s.created_at)
                    FROM package_variant_items s
                    JOIN products pr ON pr.id = s.product_id
                    JOIN product_variants pv ON pv.id = s.product_variant_id
                    WHERE s.package_variant_id = v.id
                  ), '[]'::json) AS components
           FROM package_variants v
           JOIN packages p ON p.id = v.package_id
           WHERE v.id = ANY($1::uuid[])`,
          [packageVariantIds],
        )
      : Promise.resolve({ rows: [] as Array<Record<string, unknown>> }),
  ]);

  const productMap = new Map(productRows.rows.map((row) => [String(row.variant_id), row]));
  const packageMap = new Map(packageRows.rows.map((row) => [String(row.package_variant_id), row]));

  return items.map((item) => {
    if (item.type === "package") {
      const row = packageMap.get(item.packageVariantId!);
      if (!row) throw new Error("أحد البكدجات المختارة لم يعد موجودًا.");
      const components = (row.components ?? []) as Array<{ productName: string; color: string; size: string; quantity: number }>;
      const description = components
        .map((component) => `${component.productName} (${canonicalColorName(component.color)} / ${component.size}) ×${component.quantity}`)
        .join("، ");
      const unitPrice = roundMoney(Number(row.price_after_discount ?? 0));
      const beforeValue = Number(row.price_before_discount ?? 0);
      const unitBefore = beforeValue > unitPrice ? roundMoney(beforeValue) : unitPrice;
      const explicitCost = Number(row.supply_price ?? 0);
      const unitCost = roundMoney(explicitCost > 0 ? explicitCost : Number(row.components_cost ?? 0));
      return {
        itemType: "package" as const,
        productId: null,
        productVariantId: null,
        packageId: String(row.package_id),
        packageVariantId: String(row.package_variant_id),
        name: `${String(row.package_name)} — ${String(row.variant_name)
          .split("/")
          .map((part) => canonicalColorName(part.trim()))
          .join(" / ")}`,
        description: description || null,
        sku: row.sku ? String(row.sku) : null,
        imageUrl: row.image_url ? String(row.image_url) : null,
        unitBefore,
        unitPrice,
        unitCost,
        supplierId: row.supplier_id ? String(row.supplier_id) : null,
        quantity: item.quantity,
        lineBefore: roundMoney(unitBefore * item.quantity),
        lineTotal: roundMoney(unitPrice * item.quantity),
      };
    }

    const row = productMap.get(item.variantId!);
    if (!row) throw new Error("أحد المنتجات المختارة لم يعد موجودًا.");
    const unitPrice = roundMoney(Number(row.price ?? 0));
    const beforeValue = Number(row.price_before_discount ?? 0);
    const unitBefore = beforeValue > unitPrice ? roundMoney(beforeValue) : unitPrice;
    const unitCost = roundMoney(Math.max(0, Number(row.supply_price ?? 0)));
    return {
      itemType: "product" as const,
      productId: String(row.product_id),
      productVariantId: String(row.variant_id),
      packageId: null,
      packageVariantId: null,
      name: String(row.product_name),
      description: `اللون: ${canonicalColorName(String(row.color))} · المقاس: ${String(row.size)}`,
      sku: row.sku ? String(row.sku) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      unitBefore,
      unitPrice,
      unitCost,
      supplierId: row.supplier_id ? String(row.supplier_id) : null,
      quantity: item.quantity,
      lineBefore: roundMoney(unitBefore * item.quantity),
      lineTotal: roundMoney(unitPrice * item.quantity),
    };
  });
}

async function nextInvoiceNumber(client: PoolClient) {
  const result = await client.query("SELECT nextval('invoices_number_seq') AS seq");
  const sequence = Number(result.rows[0].seq);
  return `INV-${String(sequence).padStart(4, "0")}`;
}

export async function createInvoice(input: InvoiceInput, actor?: string) {
  await ensureInvoiceTables();
  const settings = await getSettings();
  const items = await resolveInvoiceItems(input.items);
  const subtotal = roundMoney(items.reduce((total, item) => total + item.lineTotal, 0));
  const totals = buildInvoiceTotals(subtotal, input.discountType, input.discountValue, input.deliveryFee);
  const paidAmount = roundMoney(Math.min(input.paidAmount, totals.total));
  const status = deriveInvoiceStatus(totals.total, paidAmount);
  const dueDate =
    input.dueDate ??
    new Date(Date.now() + settings.paymentTermsDays * 86_400_000).toISOString().slice(0, 10);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const invoiceNumber = await nextInvoiceNumber(client);
    const inserted = await client.query(
      `INSERT INTO invoices
        (invoice_number, customer_id, customer_name, customer_phone, customer_address,
         delivery_area, subtotal, discount_type, discount_value, discount_amount,
         delivery_fee, total, paid_amount, status, payment_method, notes, due_date, view_nonce)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id`,
      [
        invoiceNumber,
        input.customerId,
        input.customerName,
        input.customerPhone || null,
        input.customerAddress || null,
        input.deliveryArea || null,
        totals.subtotal,
        input.discountType,
        input.discountValue,
        totals.discountAmount,
        totals.deliveryFee,
        totals.total,
        paidAmount,
        status,
        input.paymentMethod,
        input.notes || null,
        dueDate,
        newViewNonce(),
      ],
    );
    const invoiceId = String(inserted.rows[0].id);

    if (paidAmount > 0) {
      const receiptNumber = await nextReceiptNumber(client);
      await client.query(
        `INSERT INTO invoice_payments
          (receipt_number, invoice_id, amount, payment_method, paid_at, notes, recorded_by)
         VALUES ($1,$2,$3,$4,NOW(),$5,$6)`,
        [receiptNumber, invoiceId, paidAmount, input.paymentMethod, "دفعة أولية عند إصدار الفاتورة", actor ?? null],
      );
    }

    for (const [index, item] of items.entries()) {
      await client.query(
        `INSERT INTO invoice_items
          (invoice_id, item_type, product_id, product_variant_id, package_id, package_variant_id,
           name, description, sku, image_url, unit_before, unit_price, quantity,
           line_before, line_total, sort_order, unit_cost, supplier_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          invoiceId,
          item.itemType,
          item.productId,
          item.productVariantId,
          item.packageId,
          item.packageVariantId,
          item.name,
          item.description,
          item.sku,
          item.imageUrl,
          item.unitBefore,
          item.unitPrice,
          item.quantity,
          item.lineBefore,
          item.lineTotal,
          index,
          item.unitCost,
          item.supplierId,
        ],
      );
    }

    await logActivity(
      {
        entityType: "invoice",
        entityId: invoiceId,
        action: "invoice.created",
        summary: `إنشاء الفاتورة ${invoiceNumber} للعميلة ${input.customerName}`,
        actor,
      },
      client,
    );
    await client.query("COMMIT");
    return invoiceId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type InvoicePatch = {
  discountType?: DiscountType;
  discountValue?: number;
  deliveryFee?: number;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  status?: InvoiceStatus;
  notes?: string;
  deliveryArea?: string;
  dueDate?: string;
};

export async function updateInvoice(id: string, patch: InvoicePatch, actor?: string) {
  await ensureInvoiceTables();
  const existingResult = await db.query("SELECT * FROM invoices WHERE id = $1", [id]);
  const existing = existingResult.rows[0];
  if (!existing) return null;

  const discountType = DISCOUNT_TYPES.includes(patch.discountType as DiscountType)
    ? (patch.discountType as DiscountType)
    : (existing.discount_type as DiscountType);
  const discountValue =
    patch.discountValue === undefined
      ? Number(existing.discount_value)
      : roundMoney(Math.max(0, Number(patch.discountValue) || 0));
  if (discountType === "percent" && discountValue > 100) throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");

  const deliveryFee =
    patch.deliveryFee === undefined
      ? Number(existing.delivery_fee)
      : roundMoney(Math.max(0, Number(patch.deliveryFee) || 0));
  const paidAmount =
    patch.paidAmount === undefined
      ? Number(existing.paid_amount)
      : roundMoney(Math.max(0, Number(patch.paidAmount) || 0));

  const paymentMethod = PAYMENT_METHODS.includes(patch.paymentMethod as PaymentMethod)
    ? (patch.paymentMethod as PaymentMethod)
    : (existing.payment_method as PaymentMethod);

  const totals = buildInvoiceTotals(Number(existing.subtotal), discountType, discountValue, deliveryFee);
  const effectivePaid = roundMoney(Math.min(paidAmount, totals.total));
  const cancelled = patch.status === "cancelled";
  const status = cancelled
    ? "cancelled"
    : patch.status && patch.status !== "cancelled"
      ? deriveInvoiceStatus(totals.total, effectivePaid)
      : existing.status === "cancelled"
        ? "cancelled"
        : deriveInvoiceStatus(totals.total, effectivePaid);

  const notes = patch.notes === undefined ? existing.notes : patch.notes.trim() || null;
  const deliveryArea =
    patch.deliveryArea === undefined ? existing.delivery_area : patch.deliveryArea.trim() || null;
  let dueDate = existing.due_date;
  if (patch.dueDate !== undefined) {
    if (!patch.dueDate) dueDate = null;
    else {
      const parsed = new Date(patch.dueDate);
      if (Number.isNaN(parsed.getTime())) throw new Error("تاريخ الاستحقاق غير صحيح.");
      dueDate = parsed.toISOString().slice(0, 10);
    }
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM invoices WHERE id = $1 FOR UPDATE", [id]);

    // Keep the payments ledger in sync when the total or a legacy paidAmount edit changes the balance.
    const currentPaid = roundMoney(Number(existing.paid_amount));
    let delta = roundMoney(effectivePaid - currentPaid);
    if (Math.abs(delta) > 0.001) {
      if (delta > 0) {
        const receiptNumber = await nextReceiptNumber(client);
        await client.query(
          `INSERT INTO invoice_payments
            (receipt_number, invoice_id, amount, payment_method, paid_at, notes, recorded_by)
           VALUES ($1,$2,$3,$4,NOW(),$5,$6)`,
          [receiptNumber, id, delta, paymentMethod, "تعديل رصيد الفاتورة", actor ?? null],
        );
      } else {
        const payments = await client.query(
          `SELECT id, amount FROM invoice_payments WHERE invoice_id = $1
           ORDER BY paid_at DESC, created_at DESC`,
          [id],
        );
        let toRemove = -delta;
        for (const row of payments.rows) {
          if (toRemove <= 0.001) break;
          await client.query("DELETE FROM invoice_payments WHERE id = $1", [row.id]);
          toRemove = roundMoney(toRemove - Number(row.amount));
        }
        if (toRemove < -0.001) {
          const receiptNumber = await nextReceiptNumber(client);
          await client.query(
            `INSERT INTO invoice_payments
              (receipt_number, invoice_id, amount, payment_method, paid_at, notes, recorded_by)
             VALUES ($1,$2,$3,$4,NOW(),$5,$6)`,
            [receiptNumber, id, -toRemove, paymentMethod, "تسوية رصيد بعد التعديل", actor ?? null],
          );
        }
      }
    }

    await client.query(
      `UPDATE invoices
       SET discount_type = $1, discount_value = $2, discount_amount = $3,
           delivery_fee = $4, total = $5, paid_amount = $6, status = $7,
           payment_method = $8, notes = $9, delivery_area = $10, due_date = $11, updated_at = NOW()
       WHERE id = $12`,
      [
        discountType,
        discountValue,
        totals.discountAmount,
        totals.deliveryFee,
        totals.total,
        effectivePaid,
        status,
        paymentMethod,
        notes,
        deliveryArea,
        dueDate,
        id,
      ],
    );

    if (patch.status && patch.status !== existing.status) {
      await logActivity(
        {
          entityType: "invoice",
          entityId: id,
          action: patch.status === "cancelled" ? "invoice.cancelled" : "invoice.reactivated",
          summary: `${patch.status === "cancelled" ? "إلغاء" : "إعادة تنشيط"} الفاتورة ${existing.invoice_number}`,
          actor,
        },
        client,
      );
    }

    await client.query("COMMIT");
    return { id, total: totals.total, status };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delivery progress is intentionally separate from invoice amounts and the
 * payments ledger: changing it never reprices the invoice or resends payments.
 */
export async function setInvoiceDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  actor?: string,
) {
  await ensureInvoiceTables();
  const existingResult = await db.query(
    "SELECT invoice_number, delivery_status FROM invoices WHERE id = $1",
    [id],
  );
  const existing = existingResult.rows[0];
  if (!existing) return null;

  const previous = normalizeDeliveryStatus(existing.delivery_status) ?? "preparing";
  const invoiceNumber = String(existing.invoice_number ?? id);
  if (previous === status) {
    return { invoiceNumber, deliveryStatus: status, changed: false };
  }

  await db.query(
    "UPDATE invoices SET delivery_status = $1, updated_at = NOW() WHERE id = $2",
    [status, id],
  );
  await logActivity({
    entityType: "invoice",
    entityId: id,
    action: "invoice.delivery_status",
    summary: `حالة توصيل الفاتورة ${invoiceNumber}: ${deliveryStatusLabels[previous]} ← ${deliveryStatusLabels[status]}`,
    actor,
  });
  return { invoiceNumber, deliveryStatus: status, changed: true };
}

/**
 * Full invoice edit: customer, items, pricing, notes and dates are all
 * replaced in one transaction. Prices are always re-read from the database,
 * never trusted from the browser, and recorded payments are left untouched.
 */
export async function updateInvoiceWithItems(id: string, input: InvoiceInput, actor?: string) {
  await ensureInvoiceTables();
  const existingResult = await db.query("SELECT * FROM invoices WHERE id = $1", [id]);
  const existing = existingResult.rows[0];
  if (!existing) return null;

  const items = await resolveInvoiceItems(input.items);
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const totals = buildInvoiceTotals(subtotal, input.discountType, input.discountValue, input.deliveryFee);

  // The collections ledger is the source of truth for what was paid.
  const paidAmount = roundMoney(Number(existing.paid_amount || 0));
  const cancelled = existing.status === "cancelled";
  const status = deriveInvoiceStatus(totals.total, paidAmount, cancelled);
  const dueDate =
    input.dueDate ??
    existing.due_date ??
    new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query("SELECT id FROM invoices WHERE id = $1 FOR UPDATE", [id]);
    if (!lock.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE invoices SET
         customer_id = $1, customer_name = $2, customer_phone = $3, customer_address = $4,
         delivery_area = $5, subtotal = $6, discount_type = $7, discount_value = $8,
         discount_amount = $9, delivery_fee = $10, total = $11, paid_amount = $12,
         status = $13, payment_method = $14, notes = $15, due_date = $16, updated_at = NOW()
       WHERE id = $17`,
      [
        input.customerId,
        input.customerName,
        input.customerPhone || null,
        input.customerAddress || null,
        input.deliveryArea || null,
        totals.subtotal,
        input.discountType,
        input.discountValue,
        totals.discountAmount,
        totals.deliveryFee,
        totals.total,
        paidAmount,
        status,
        input.paymentMethod,
        input.notes || null,
        dueDate,
        id,
      ],
    );

    await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [id]);
    for (const [index, item] of items.entries()) {
      await client.query(
        `INSERT INTO invoice_items
          (invoice_id, item_type, product_id, product_variant_id, package_id, package_variant_id,
           name, description, sku, image_url, unit_before, unit_price, quantity,
           line_before, line_total, sort_order, unit_cost, supplier_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          id,
          item.itemType,
          item.productId,
          item.productVariantId,
          item.packageId,
          item.packageVariantId,
          item.name,
          item.description,
          item.sku,
          item.imageUrl,
          item.unitBefore,
          item.unitPrice,
          item.quantity,
          item.lineBefore,
          item.lineTotal,
          index,
          item.unitCost,
          item.supplierId,
        ],
      );
    }

    await logActivity(
      {
        entityType: "invoice",
        entityId: id,
        action: "invoice.updated",
        summary: `تعديل الفاتورة ${existing.invoice_number} — إجمالي ${totals.total}، ${items.length} عنصر`,
        actor,
      },
      client,
    );
    await client.query("COMMIT");
    return { id, total: totals.total, status };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
