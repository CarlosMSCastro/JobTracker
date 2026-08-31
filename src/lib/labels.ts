export const STATUS_LABELS: Record<string, string> = {
  NOVA: "Nova",
  APLICADA: "Aplicada",
  ENTREVISTA: "Entrevista",
  REJEITADA: "Rejeitada",
  OFERTA: "Oferta",
  DESISTI: "Desisti",
};

// Cor semântica por estado — deliberadamente à parte do acento âmbar da app (ver globals.css),
// para o acento continuar a significar só "ação/destaque" e o estado ler-se como um badge de CI.
export const STATUS_COLORS: Record<string, string> = {
  NOVA: "border-blue-400/30 bg-blue-500/10 text-blue-300",
  APLICADA: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  ENTREVISTA: "border-purple-400/30 bg-purple-500/10 text-purple-300",
  REJEITADA: "border-red-400/30 bg-red-500/10 text-red-300",
  OFERTA: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  DESISTI: "border-border bg-surface text-muted",
};

export const REMOTE_LABELS: Record<string, string> = {
  REMOTO: "Remoto",
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
};

export const DATE_PRESETS = [
  { label: "Qualquer data", value: "" },
  { label: "Hoje", value: "1" },
  { label: "Últimos 3 dias", value: "3" },
  { label: "Última semana", value: "7" },
  { label: "Último mês", value: "30" },
] as const;
