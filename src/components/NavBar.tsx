"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/ProfileProvider";

const TABS = [
  { href: "/", label: "Vagas" },
  { href: "/guardadas", label: "Guardadas" },
  { href: "/candidaturas", label: "Candidaturas" },
  { href: "/fontes", label: "Fontes" },
];

const PROFILE_LABELS = { CARLOS: "Carlos", KAROL: "Karol" };

export function NavBar() {
  const pathname = usePathname();
  const { profile, setProfile } = useProfile();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-accent">&gt;_</span>
          Job Tracker
        </div>
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-background font-medium text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setProfile(null)}
            title="Trocar perfil"
            className="ml-2 rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            {PROFILE_LABELS[profile]}
          </button>
        </nav>
      </div>
    </header>
  );
}
