"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Today", icon: HomeIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/progress", label: "Progress", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
] as const;

export function BottomNav({ onLog }: { onLog: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="panel-dark flex w-full max-w-sm items-center justify-around rounded-full py-2 pl-1.5 pr-1.5 shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl">
        {TABS.slice(0, 2).map((tab) => (
          <NavLink key={tab.href} tab={tab} active={pathname === tab.href} />
        ))}

        <button
          onClick={onLog}
          aria-label="Log food"
          className="btn-glow relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 text-black transition active:scale-95"
        >
          <PlusIcon />
        </button>

        {TABS.slice(2).map((tab) => (
          <NavLink key={tab.href} tab={tab} active={pathname === tab.href} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[11px] font-medium transition ${
        active ? "text-lime-300" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      <Icon active={active} />
      {tab.label}
    </Link>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M4 19V9M12 19V4M20 19v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9c.31-.57.27-1.28-.15-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.57-.31 1.28-.27 1.82.15V4.6A1.65 1.65 0 0 0 12 3h0a2 2 0 0 1 2 0v.09c.57.31 1.28.27 1.82-.15l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.42.54-.46 1.25-.15 1.82.31.57.87.93 1.51 1H21a2 2 0 0 1 0 4h-.09c-.64.07-1.2.43-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
