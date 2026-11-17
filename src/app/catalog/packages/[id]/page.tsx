import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPackageDetail } from "@/components/public-catalog-detail";
import { getPublicPackage } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getPublicPackage(id);
  return {
    title: pkg ? `${pkg.name} | لونيفا` : "تفاصيل البكدج | لونيفا",
    description:
      pkg?.description?.trim() ||
      "تفاصيل البكدج ومكوناته وتوليفاته وأسعاره النهائية بعد الخصم في كتالوج لونيفا.",
  };
}

export default async function PublicPackagePage({ params }: PageProps) {
  const { id } = await params;
  const pkg = await getPublicPackage(id);
  if (!pkg) notFound();

  return <PublicPackageDetail pkg={pkg} />;
}
