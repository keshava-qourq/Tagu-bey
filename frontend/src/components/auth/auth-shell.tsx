export function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="panel-dark relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="animate-glow-pulse pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className={`relative w-full ${wide ? "max-w-md" : "max-w-sm"} animate-slide-up`}>
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-sm font-extrabold text-black">
            C
          </div>
          <p className="text-lg font-bold tracking-tight text-white">
            Calorie<span className="text-gradient-lime">Track</span>
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.07] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
