export type InventoryTransactionType =
  | "invoice_deduction"
  | "invoice_restore"
  | "manual_adjustment"
  | "restock"
  | "damage_or_loss"
  | "initial_stock";

export const inventoryTransactionLabels: Record<InventoryTransactionType, string> = {
  invoice_deduction: "صرف فاتورة",
  invoice_restore: "استرجاع من فاتورة",
  manual_adjustment: "تعديل يدوي",
  restock: "إضافة بضاعة (توريد)",
  damage_or_loss: "هالك / فقدان",
  initial_stock: "رصيد افتتاحي",
};

export type ComprehensiveInventoryData = {
  analytics: {
    total_products: number;
    total_variants: number;
    total_stock_pieces: number;
    out_of_stock_count: number;
    low_stock_count: number;
    healthy_stock_count: number;
    total_cost_value: number;
    total_retail_value: number;
    potential_profit: number;
    total_packages: number;
  };
  variants: Array<{
    variant_id: string;
    product_id: string;
    product_name: string;
    category: string | null;
    primary_sku: string;
    color: string;
    size: string;
    sku: string;
    stock: number;
    min_stock_alert: number;
    price: number;
    supply_price: number;
    supplier_name: string | null;
    image_url: string | null;
  }>;
  packages: Array<{
    id: string;
    name: string;
    primary_sku: string;
    status: string;
    image_url: string | null;
    variants: Array<{
      id: string;
      name: string;
      sku: string;
      calculated_stock: number;
      bottleneck: {
        product_name: string;
        color: string;
        size: string;
        current_stock: number;
        required_qty: number;
      } | null;
      components: Array<{
        product_name: string;
        color: string;
        size: string;
        required_qty: number;
        current_stock: number;
      }>;
    }>;
  }>;
  alerts: Array<{
    variant_id: string;
    product_id: string;
    product_name: string;
    primary_sku: string;
    color: string;
    size: string;
    sku: string;
    stock: number;
    min_stock_alert: number;
    price: number;
    image_url: string | null;
    product_image_url: string | null;
  }>;
  transactions: Array<{
    id: string;
    product_id: string;
    product_variant_id: string;
    change_qty: number;
    previous_stock: number;
    new_stock: number;
    type: InventoryTransactionType;
    reference_id: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    product_name: string;
    color: string;
    size: string;
    sku: string;
  }>;
};
