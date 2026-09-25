import { ApplicationsList } from "@/components/ApplicationsList";

const SAVED_STATUSES = ["GUARDADA"];

export default function GuardadasPage() {
  return (
    <ApplicationsList
      title="Guardadas"
      statuses={SAVED_STATUSES}
      emptyMessage="Ainda não guardaste nenhuma vaga. Usa o botão Guardar numa vaga da lista principal."
    />
  );
}
