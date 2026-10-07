import { NavegacaoContexto } from "@/components/navegacao-contexto";

export function NavegacaoLancamento({ id, tipo, status }: { id: string; tipo: string; status: string }) {
  const raiz = `/financeiro/lancamentos/${id}`;
  return <NavegacaoContexto nome="Ações deste lançamento" links={[
    ...(!["pago", "cancelado"].includes(status) ? [{ href: `${raiz}/editar`, label: "Dados do lançamento" }] : []),
    { href: `${raiz}/baixar`, label: tipo === "despesa" ? "Pagamento e histórico" : "Recebimento e histórico" },
    ...(tipo === "despesa" ? [{ href: `${raiz}/anexos`, label: "Anexo / boleto" }] : []),
  ]} />;
}
