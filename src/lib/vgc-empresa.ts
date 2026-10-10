import type { VendaVgv } from "./vgv-empresa";

export type ComissaoConferidaVgc = {
  id: string;
  ano: number;
  imovel: string;
  valorCentavos: number;
  processoId?: string;
  pendencia?: string;
  fonte: string;
};

/** Valores contratuais da Sacra + equipe, sem parceiros nem pagamentos internos duplicados.
 * Um cadastro vinculado cancelado, excluído ou de outro ano nunca recupera o histórico.
 * Pendências documentais não entram no valor apurado.
 */
export function somarVgcEmpresa(ano: number, vendas: readonly VendaVgv[], comissoes: readonly ComissaoConferidaVgc[], foraDoAno: readonly string[] = []) {
  const excluidos = new Set(foraDoAno);
  const porId = new Map(vendas.map(v => [v.id, v]));
  if (porId.size !== vendas.length) throw new Error("Venda duplicada no VGC.");
  const ids = new Set<string>();
  const vinculados = new Set<string>();
  let apuradoCentavos = 0;
  let pendenteCentavos = 0;
  let vendasConferidas = 0;
  const pendencias: ComissaoConferidaVgc[] = [];
  for (const comissao of comissoes) {
    if (ids.has(comissao.id)) throw new Error("Comissão duplicada no VGC.");
    ids.add(comissao.id);
    if (!Number.isSafeInteger(comissao.valorCentavos) || comissao.valorCentavos < 0) throw new Error("Valor de comissão inválido.");
    if (comissao.processoId) {
      if (vinculados.has(comissao.processoId)) throw new Error("Venda vinculada a duas comissões totais.");
      vinculados.add(comissao.processoId);
    }
    if (comissao.ano !== ano) continue;
    if (comissao.processoId) {
      const venda = porId.get(comissao.processoId);
      if (!venda || excluidos.has(venda.id) || venda.categoria !== "venda" || venda.status === "cancelado" || !venda.data_criacao.startsWith(`${ano}-`)) continue;
    }
    if (comissao.pendencia) {
      pendenteCentavos += comissao.valorCentavos;
      pendencias.push(comissao);
    } else {
      apuradoCentavos += comissao.valorCentavos;
      vendasConferidas++;
    }
  }
  if (!Number.isSafeInteger(apuradoCentavos + pendenteCentavos)) throw new Error("VGC excede o limite de cálculo.");
  const semConferencia = vendas.filter(v => v.categoria === "venda" && v.status !== "cancelado" && v.data_criacao.startsWith(`${ano}-`) && !excluidos.has(v.id) && !vinculados.has(v.id) && (v.valor_total ?? 0) > 0).length;
  return { apuradoCentavos, pendenteCentavos, vendasConferidas, pendencias, semConferencia };
}
