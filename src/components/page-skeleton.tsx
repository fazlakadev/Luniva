function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full ${className}`} style={{ background: "var(--surface-3)" }} />;
}

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} style={{ background: "var(--surface-3)" }} />;
}

export default function PageSkeleton({
  stats = 4,
  rows = 6,
  variant = "list",
}: {
  stats?: number;
  rows?: number;
  variant?: "list" | "cards" | "detail";
}) {
  return (
    <div className="page-enter" aria-busy="true" aria-label="جارِ التحميل">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="w-full max-w-xl">
          <Bar className="h-3 w-32" />
          <Bar className="mt-3 h-9 w-64 max-w-full" />
          <Bar className="mt-3 h-3 w-full max-w-md" />
        </div>
        <Block className="h-11 w-36 shrink-0" />
      </div>

      {stats > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
            <div key={index} className="stat-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Bar className="h-3 w-24" />
                  <Bar className="mt-3 h-7 w-16" />
                  <Bar className="mt-2 h-2.5 w-28" />
                </div>
                <Block className="h-11 w-11" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="app-card overflow-hidden">
              <Block className="h-40 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Bar className="h-4 w-2/3" />
                <Bar className="h-3 w-1/3" />
                <Bar className="h-3 w-full" />
                <Bar className="h-8 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="app-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Block className="h-11 w-11" />
              <div className="flex-1">
                <Bar className="h-4 w-40" />
                <Bar className="mt-2 h-3 w-56" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: rows }).map((_, index) => (
                <Block key={index} className="h-24 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="app-card space-y-3 p-5">
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-2/3" />
              <Block className="h-11 w-full" />
            </div>
            <div className="app-card p-5">
              <Block className="h-28 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <section className="app-card overflow-hidden">
          <div className="border-b p-5 sm:p-6" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3">
                <Block className="h-11 w-11" />
                <div className="flex-1">
                  <Bar className="h-4 w-36" />
                  <Bar className="mt-2 h-3 w-48" />
                </div>
              </div>
              <Block className="h-10 w-48" />
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <Block className="h-12 w-12 shrink-0" />
                <div className="flex-1">
                  <Bar className="h-4 w-40 max-w-full" />
                  <Bar className="mt-2 h-3 w-24" />
                </div>
                <Bar className="hidden h-3 w-20 sm:block" />
                <Block className="h-8 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
