"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { METODOS, ROTULO_METODO, type Metodo, type PremissasMetodo } from "@/lib/avaliacao/metodos";
import type { Finalidade } from "@/lib/avaliacao/tipos";
import { salvarMetodoComercial } from "./actions";
import { AreaTexto, Campo } from "./ui";

const decimal = (n: number | undefined) => n === undefined ? "" : String(n).replace(".", ",");
export function MetodoForm({ id, finalidade, premissas }: { id: string; finalidade: Finalidade; premissas?: PremissasMetodo }) {
  const [metodo, setMetodo] = useState<Metodo>(premissas?.metodo ?? "manual");
  const p = premissas;
  return <form action={salvarMetodoComercial} className="space-y-4">
    <input type="hidden" name="avaliacao_id" value={id} />
    <label className="block"><span className="mb-1 block text-xs font-medium text-ink-muted">Como deseja apoiar a definição do preço?</span>
      <select name="metodo" value={metodo} onChange={e => setMetodo(METODOS.find(m => m === e.target.value) ?? "manual")} className={INPUT_CLASS}>
        {METODOS.map(m => <option key={m} value={m} disabled={finalidade === "locacao" && m !== "manual" && m !== "comparativo"}>{ROTULO_METODO[m]}</option>)}
      </select>
    </label>
    {metodo === "manual" && <p className="text-sm text-ink-muted">Preencha o preço final e os textos do laudo abaixo. Os comparáveis continuam opcionais.</p>}
    {metodo === "comparativo" && <p className="text-sm leading-6 text-ink-muted">Usa a mediana dos preços por m² dos comparáveis incluídos, com os ajustes registrados, multiplicada pela área do imóvel. Cadastre as referências e seus fatores na etapa Imóveis semelhantes.</p>}
    {metodo === "evolutivo" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Campo label="Valor de mercado do terreno (R$)" name="terreno" defaultValue={decimal(p?.terreno)} inputMode="decimal" required />
      <Campo label="Área construída (m²)" name="areaConstruida" defaultValue={decimal(p?.areaConstruida)} inputMode="decimal" required />
      <Campo label="Custo de reconstrução (R$/m²)" name="custoM2" defaultValue={decimal(p?.custoM2)} inputMode="decimal" required ajuda="Informe a fonte, a data e o que está incluído no custo." />
      <Campo label="Depreciação (%)" name="depreciacaoPct" defaultValue={decimal(p?.depreciacaoPct)} inputMode="decimal" required ajuda="0 a 100%. Considere idade e conservação." />
      <Campo label="Fator de comercialização" name="fatorComercializacao" defaultValue={decimal(p?.fatorComercializacao)} inputMode="decimal" required ajuda="Coeficiente, por exemplo 1,05. Justifique com dados de mercado." />
    </div>}
    {metodo === "renda" && <>
      <p className="text-sm leading-6 text-ink-muted">Estima o valor de venda a partir da renda estabilizada. Use receitas do imóvel, não o faturamento bruto de hotel, loja ou outro negócio.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Campo label="Receita mensal bruta (R$)" name="aluguelMensal" defaultValue={decimal(p?.aluguelMensal)} inputMode="decimal" required />
        <Campo label="Vacância e perdas (%)" name="vacanciaPct" defaultValue={decimal(p?.vacanciaPct)} inputMode="decimal" required />
        <Campo label="Despesas mensais (R$)" name="despesasMensais" defaultValue={decimal(p?.despesasMensais)} inputMode="decimal" required ajuda="Gastos a cargo do proprietário, sem financiamento." />
        <Campo label="Taxa anual de capitalização (%)" name="taxaCapitalizacaoPct" defaultValue={decimal(p?.taxaCapitalizacaoPct)} inputMode="decimal" required ajuda="Taxa sustentada por mercado; não é taxa mensal." />
      </div>
    </>}
    {metodo === "involutivo" && <>
      <p className="text-sm leading-6 text-ink-muted">Estima o valor residual do terreno de um empreendimento hipotético. Descreva o projeto e a viabilidade urbanística nas premissas. Inclua todos os gastos sem repetir o preço de aquisição do terreno nem a margem abaixo.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Taxa efetiva anual de desconto (%)" name="taxaDescontoPct" defaultValue={decimal(p?.taxaDescontoPct)} inputMode="decimal" required />
        <Campo label="Margem do empreendedor sobre receitas (%)" name="lucroPct" defaultValue={decimal(p?.lucroPct)} inputMode="decimal" required />
      </div>
      <AreaTexto label="Fluxo do empreendimento" name="fluxo" rows={6} defaultValue={p?.fluxo?.map(f => `${f.mes}; ${decimal(f.receita)}; ${decimal(f.custo)}`).join("\n")} placeholder={"0; 0; 200.000\n12; 1.500.000; 800.000"} ajuda="Uma linha por mês: mês; receita em R$; custo em R$. Mês 0 = data da avaliação. Valores no fim do mês. Use vírgula para decimais; até 120 períodos e 600 meses." />
    </>}
    {metodo !== "manual" && <AreaTexto label="Fontes e justificativa das premissas" name="premissas_justificativa" defaultValue={p?.justificativa} rows={4} ajuda="Descreva a origem dos valores e taxas, datas, diferenças entre imóveis e, quando aplicável, o cenário do empreendimento. Este texto entra no relatório." />}
    <div className="flex flex-wrap gap-3">
      <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Salvar método e calcular</BotaoEnviar>
      {metodo !== "manual" && <BotaoEnviar className={PRIMARY_BUTTON_CLASS} name="acao" value="aplicar">Calcular e usar como valor sugerido</BotaoEnviar>}
    </div>
  </form>;
}
