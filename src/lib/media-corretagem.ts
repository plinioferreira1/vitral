import type { ComissaoConferidaVgc } from "./vgc-empresa";
import type { VendaVgv } from "./vgv-empresa";

type Contrato = { id: string; vendaCentavos: number; comissaoCentavos: number };

/** Média simples dos percentuais efetivos dos contratos, incluindo parceiros. */
export function mediaCorretagem(ano: number, vendas: readonly VendaVgv[], comissoes: readonly ComissaoConferidaVgc[], contratos: readonly Contrato[], foraDoAno: readonly string[] = []) {
  const porVenda = new Map(vendas.map(v => [v.id, v]));
  const excluidos = new Set(foraDoAno);
  const porContrato = new Map(contratos.map(c => [c.id, c]));
  if (porContrato.size !== contratos.length) throw new Error("Contrato duplicado na média de corretagem.");
  const pendentes: { id: string; imovel: string }[] = [];
  let soma = 0;
  let quantidade = 0;
  for (const c of comissoes) {
    if (c.ano !== ano) continue;
    if (c.processoId) {
      const v = porVenda.get(c.processoId);
      if (!v || excluidos.has(v.id) || v.categoria !== "venda" || v.status === "cancelado" || !v.data_criacao.startsWith(`${ano}-`)) continue;
    }
    const contrato = porContrato.get(c.id);
    if (!contrato) { pendentes.push({ id: c.id, imovel: c.imovel }); continue; }
    const { vendaCentavos, comissaoCentavos } = contrato;
    if (!Number.isSafeInteger(vendaCentavos) || vendaCentavos <= 0 || !Number.isSafeInteger(comissaoCentavos) || comissaoCentavos <= 0 || comissaoCentavos > vendaCentavos) throw new Error("Valores inválidos na média de corretagem.");
    soma += comissaoCentavos / vendaCentavos * 100;
    quantidade++;
  }
  return { percentual: quantidade ? soma / quantidade : null, quantidade, pendentes };
}
