export const STATUS_LABELS: Record<string, string> = {
  NOVA: "Nova",
  APLICADA: "Aplicada",
  ENTREVISTA: "Entrevista",
  REJEITADA: "Rejeitada",
  OFERTA: "Oferta",
  DESISTI: "Desisti",
};

export const STATUS_COLORS: Record<string, string> = {
  NOVA: "bg-blue-500/15 text-blue-300",
  APLICADA: "bg-amber-500/15 text-amber-300",
  ENTREVISTA: "bg-purple-500/15 text-purple-300",
  REJEITADA: "bg-red-500/15 text-red-300",
  OFERTA: "bg-green-500/15 text-green-300",
  DESISTI: "bg-neutral-800 text-neutral-500",
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
