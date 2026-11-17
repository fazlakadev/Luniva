import PageSkeleton from "@/components/page-skeleton";

export default function CustomersLoading() {
  return <PageSkeleton stats={3} rows={8} variant="list" />;
}
