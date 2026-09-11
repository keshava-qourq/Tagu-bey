export function PageHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <header className="bg-neutral-50">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 pb-2 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-base">
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-500">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
