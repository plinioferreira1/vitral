import { redirect } from "next/navigation";

/** Google Agenda está desativado. O calendário interno continua disponível. */
export default function IntegracaoAgendaDesativada() {
  redirect("/financeiro/configuracoes-email");
}
