export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary">Todome</h1>
          <p className="mt-1 text-sm text-text-secondary">
            メモ・Todo・カレンダー
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-bg-primary p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
