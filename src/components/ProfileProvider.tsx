"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ProfileName = "CARLOS" | "KAROL";

type ProfileContextValue = {
  profile: ProfileName;
  setProfile: (profile: ProfileName | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY = "job-tracker:profile";

// Só usado dentro de componentes renderizados depois da escolha de perfil (ver ProfileProvider
// abaixo) — nunca fica null nesse ponto, por isso lança em vez de devolver um tipo opcional.
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile() só pode ser usado dentro de <ProfileProvider>");
  return ctx;
}

const CARDS: { profile: ProfileName; label: string; description: string }[] = [
  { profile: "CARLOS", label: "Carlos", description: "Dev / TI / Helpdesk" },
  { profile: "KAROL", label: "Karol", description: "Eventos / Marketing / Administrativo" },
];

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<ProfileName | null>(null);
  // Distingue "ainda não li o localStorage" de "li, não havia nada guardado" — evita mostrar por
  // instantes o ecrã errado (picker vs. site) antes do efeito correr, já que o servidor nunca tem
  // acesso ao localStorage do utilizador.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de localStorage só é possível no cliente, não há alternativa a correr isto num efeito
    if (stored === "CARLOS" || stored === "KAROL") setProfileState(stored);
    setHydrated(true);
  }, []);

  function setProfile(next: ProfileName | null) {
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
    setProfileState(next);
  }

  if (!hydrated) return null;

  if (!profile) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4">
        <p className="text-sm text-muted">Quem está a usar?</p>
        <div className="flex flex-wrap justify-center gap-4">
          {CARDS.map((card) => (
            <button
              key={card.profile}
              type="button"
              onClick={() => setProfile(card.profile)}
              className="flex w-48 flex-col gap-2 rounded-lg border border-border bg-surface p-6 text-left transition-colors hover:border-accent"
            >
              <span className="text-lg font-semibold text-foreground">{card.label}</span>
              <span className="text-xs text-muted">{card.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}
