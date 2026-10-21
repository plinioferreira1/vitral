import type { Database } from "@/lib/database.types";
import { FUSO_BR } from "@/lib/data-br";

export type Negociacao =
  Database["public"]["Tables"]["vendas_negociacoes"]["Row"];
export const SITUACAO_LABEL = {
  em_andamento: "Em andamento",
  convertida: "Convertida",
  perdida: "Perdida",
};
export type FiltroNegociacoes =
  "em_andamento" | "novas" | "convertida" | "perdida" | "todas";
export function filtroNegociacoes(valor: unknown): FiltroNegociacoes {
  return valor === "novas" ||
    valor === "convertida" ||
    valor === "perdida" ||
    valor === "todas"
    ? valor
    : "em_andamento";
}
export function mesValido(valor: unknown, padrao: string): string {
  return typeof valor === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) &&
    valor.slice(0, 4) >= "2000" &&
    valor.slice(0, 4) <= "2100"
    ? valor
    : padrao;
}
export function mesDoInstante(valor: string | null): string | null {
  if (!valor) return null;
  return new Date(valor)
    .toLocaleDateString("sv-SE", { timeZone: FUSO_BR })
    .slice(0, 7);
}
export function filtrarNegociacoes(
  lista: Negociacao[],
  filtro: FiltroNegociacoes,
  mes: string,
) {
  return lista.filter(
    (n) =>
      filtro === "todas" ||
      (filtro === "em_andamento"
        ? n.situacao === filtro
        : filtro === "novas"
          ? n.data_abertura.slice(0, 7) === mes
          : n.situacao === filtro && mesDoInstante(n.encerrada_em) === mes),
  );
}
export function metricasNegociacoes(lista: Negociacao[], mes: string) {
  const abertas = lista.filter((n) => n.situacao === "em_andamento");
  const novas = filtrarNegociacoes(lista, "novas", mes);
  const convertidas = filtrarNegociacoes(lista, "convertida", mes);
  const perdidas = filtrarNegociacoes(lista, "perdida", mes);
  const somar = (ns: Negociacao[]) =>
    ns.reduce((s, n) => s + Math.round(n.valor * 100), 0) / 100;
  const encerradas = convertidas.length + perdidas.length;
  return {
    abertas: abertas.length,
    novas: novas.length,
    convertidas: convertidas.length,
    perdidas: perdidas.length,
    valorAberto: somar(abertas),
    valorConvertido: somar(convertidas),
    valorPerdido: somar(perdidas),
    taxa: encerradas ? (convertidas.length / encerradas) * 100 : null,
  };
}
export function podeEditarNegociacoes(nivel: string, temVenda: boolean) {
  return (
    temVenda &&
    ["diretor", "gerente", "supervisor", "gerente_locacao"].includes(nivel)
  );
}
export function validarCadastro(
  d: {
    cliente_nome: string;
    imovel_endereco: string;
    valor: number;
    data_abertura: string;
    previsao_fechamento: string;
    data_acompanhamento: string;
    responsavel_id: string;
  },
  hoje: string,
): string | null {
  if (!d.cliente_nome.trim() || d.cliente_nome.length > 200)
    return "Informe o cliente (até 200 caracteres).";
  if (!d.imovel_endereco.trim() || d.imovel_endereco.length > 500)
    return "Informe o imóvel (até 500 caracteres).";
  if (!Number.isFinite(d.valor) || d.valor < 0 || d.valor > 999999999999.99)
    return "Informe um valor válido.";
  const dataValida = (data: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    !Number.isNaN(Date.parse(data)) &&
    new Date(data).toISOString().slice(0, 10) === data;
  if (!dataValida(d.data_abertura) || d.data_abertura > hoje)
    return "Informe uma data de abertura válida, até hoje.";
  if (
    [d.previsao_fechamento, d.data_acompanhamento].some(
      (data) => data && !dataValida(data),
    )
  )
    return "Confira as datas de previsão e acompanhamento.";
  if (!d.responsavel_id) return "Escolha o responsável.";
  return null;
}
