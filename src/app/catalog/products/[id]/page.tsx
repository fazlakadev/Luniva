import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProductDetail } from "@/components/public-catalog-detail";
import { getPublicProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);
  return {
    title: product ? `${product.name} | لونيفا` : "تفاصيل المنتج | لونيفا",
    description:
      product?.description?.trim() ||
      "تفاصيل المنتج والألوان والمقاسات والسعر النهائي بعد الخصم في كتالوج لونيفا.",
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) notFound();

  return <PublicProductDetail product={product} />;
}
