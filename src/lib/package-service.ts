import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import {
  applyDiscount,
  normalizePackagePayload,
  priceSelectionTotal,
  roundMoney,
  type PackagePayload,
  type PackageVariantInput,
  type VariantPriceSource,
} from "@/lib/packages";
import { uploadImage } from "@/lib/upload";

export type PreparedVariant = PackageVariantInput & {
  before: number;
  after: number;
};

export type PreparedPackage = {
  payload: PackagePayload;
  variants: PreparedVariant[];
  imageUrl: string | null;
  variantSources: Map<string, VariantPriceSource>;
};

export async function preparePackage(form: FormData, fallbackImageUrl: string | null = null): Promise<PreparedPackage> {
  const payload = normalizePackagePayload(JSON.parse(String(form.get("payload") ?? "{}")));

  const products = await db.query("SELECT id FROM products WHERE id = ANY($1::uuid[])", [payload.items.map((item) => item.productId)]);
  if (products.rowCount !== payload.items.length) throw new Error("أحد المنتجات المختارة لم يعد موجودًا.");

  const variantIds = [...new Set(payload.variants.flatMap((variant) => variant.selections.map((selection) => selection.variantId)))];
  const variantResult = await db.query(
    "SELECT id, product_id, color, size, sku, price, price_before_discount, image_url FROM product_variants WHERE id = ANY($1::uuid[])",
    [variantIds],
  );
  const variantSources = new Map<string, VariantPriceSource>(
    variantResult.rows.map((row) => [String(row.id), row as VariantPriceSource]),
  );

  if (variantSources.size !== variantIds.length) throw new Error("أحد المتغيرات المختارة لم يعد موجودًا، حدّثي الصفحة.");

  const variants: PreparedVariant[] = [];
  for (const [index, variant] of payload.variants.entries()) {
    for (const selection of variant.selections) {
      const source = variantSources.get(selection.variantId);
      if (!source || source.product_id !== selection.productId) {
        throw new Error("أحد المتغيرات لا يتبع المنتج المحدد داخل البكدج.");
      }
    }

    const before = priceSelectionTotal(payload.items, variant.selections, variantSources);
    const after = applyDiscount(before, variant.discountType, variant.discountValue);
    const uploadedImage = await uploadImage(form.get(`variantImage-${index}`));

    variants.push({
      ...variant,
      before: roundMoney(before),
      after: roundMoney(after),
      imageUrl: uploadedImage ?? variant.imageUrl,
    });
  }

  const uploadedMainImage = await uploadImage(form.get("image"));
  return {
    payload,
    variants,
    imageUrl: uploadedMainImage ?? fallbackImageUrl ?? payload.imageUrl,
    variantSources,
  };
}

export async function savePackage(client: PoolClient, prepared: PreparedPackage, packageId?: string) {
  const { payload, variants } = prepared;
  const summary = [...variants].sort((a, b) => a.after - b.after)[0];
  let id = packageId;

  if (id) {
    const updated = await client.query(
      `UPDATE packages
       SET name = $1, primary_sku = $2, description = $3, image_url = $4,
           price_before_discount = $5, price_after_discount = $6,
           status = $7, badge = $8, discount_type = $9, discount_value = $10, updated_at = NOW()
       WHERE id = $11 RETURNING id`,
      [
        payload.name,
        payload.primarySku,
        payload.description,
        prepared.imageUrl,
        summary.before,
        summary.after,
        payload.status,
        payload.badge,
        summary.discountType,
        summary.discountValue,
        id,
      ],
    );
    if (!updated.rowCount) return null;
    await client.query("DELETE FROM package_variants WHERE package_id = $1", [id]);
    await client.query("DELETE FROM package_items WHERE package_id = $1", [id]);
  } else {
    const created = await client.query(
      `INSERT INTO packages
        (name, primary_sku, description, image_url, price_before_discount, price_after_discount, status, badge, discount_type, discount_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        payload.name,
        payload.primarySku,
        payload.description,
        prepared.imageUrl,
        summary.before,
        summary.after,
        payload.status,
        payload.badge,
        summary.discountType,
        summary.discountValue,
      ],
    );
    id = String(created.rows[0].id);
  }

  const itemIds = new Map<string, string>();
  for (const [index, item] of payload.items.entries()) {
    const inserted = await client.query(
      "INSERT INTO package_items (package_id, product_id, quantity, sort_order) VALUES ($1,$2,$3,$4) RETURNING id",
      [id, item.productId, item.quantity, index],
    );
    itemIds.set(item.productId, String(inserted.rows[0].id));
  }

  for (const [index, variant] of variants.entries()) {
    const inserted = await client.query(
      `INSERT INTO package_variants
        (package_id, name, sku, price_before_discount, price_after_discount, image_url, stock, discount_type, discount_value, is_default, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        id,
        variant.name,
        variant.sku,
        variant.before,
        variant.after,
        variant.imageUrl,
        variant.stock,
        variant.discountType,
        variant.discountValue,
        index === 0,
        index,
      ],
    );
    const packageVariantId = String(inserted.rows[0].id);

    for (const selection of variant.selections) {
      const packageItemId = itemIds.get(selection.productId);
      const source = prepared.variantSources.get(selection.variantId);
      const quantity = payload.items.find((item) => item.productId === selection.productId)?.quantity ?? 1;
      if (!packageItemId || !source) throw new Error("تعذر ربط المتغيرات بعناصر البكدج.");
      await client.query(
        `INSERT INTO package_variant_items
          (package_variant_id, package_item_id, product_id, product_variant_id, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [packageVariantId, packageItemId, selection.productId, selection.variantId, quantity, Number(source.price)],
      );
    }
  }

  return id;
}
