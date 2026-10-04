"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoMoeda } from "@/components/campo-moeda";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { arredondarValor, posicaoNaFaixa, precoPorM2 } from "@/lib/avaliacao/calculo";
import type { Finalidade } from "@/lib/avaliacao/tipos";
import { salvarPrecificacao } from "./actions";
import { Aviso, ROTULO_CLASS, moeda, moedaM2 } from "./ui";

export function FormPreco({
  avaliacaoId,
  finalidade,
  areaM2,
  rotuloValor,
  valorCalculado,
  faixaCalculadaMin,
  faixaCalculadaMax,
  inicial,
}: {
  avaliacaoId: string;
  finalidade: Finalidade;
  areaM2: number | null;
  rotuloValor: string;
  valorCalculado: number | null;
  faixaCalculadaMin: number | null;
  faixaCalculadaMax: number | null;
  inicial: {
    valorSugerido: number | null;
    justificativaValor: string;
    faixaManual: boolean;
    faixaMin: number | null;
    faixaMax: number | null;
    justificativaFaixa: string;
    margem: number | null;
    valorProprietario: number | null;
    fundamentacao: string;
  };
}) {
  const [valor, setValor] = useState<number>(inicial.valorSugerido ?? 0);
  const [faixaManual, setFaixaManual] = useState(inicial.faixaManual);
  const [faixaMin, setFaixaMin] = useState<number>(inicial.faixaMin ?? faixaCalculadaMin ?? 0);
  const [faixaMax, setFaixaMax] = useState<number>(inicial.faixaMax ?? faixaCalculadaMax ?? 0);
  const [margem, setMargem] = useState(inicial.margem !== null ? String(inicial.margem).replace(".", ",") : "");

  const min = faixaManual ? faixaMin || null : faixaCalculadaMin;
  const max = faixaManual ? faixaMax || null : faixaCalculadaMax;
  const posicao = posicaoNaFaixa(valor || null, min, max);
  const difereDoCalculado = valor > 0 && valorCalculado !== null && valor !== valorCalculado;
  const margemNumero = Number(margem.replace(",", "."));
  const comMargem =
    valorCalculado !== null && Number.isFinite(margemNumero) && margemNumero > 0
      ? arredondarValor(valorCalculado * (1 + margemNumero / 100), finalidade)
      : null;

  return (
    <form action={salvarPrecificacao} className="space-y-5">
      <input type="hidden" name="avaliacao_id" value={avaliacaoId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/70 p-4">
          <p className="text-sm font-semibold text-ink">{rotuloValor}</p>
          <div>
            <span className={ROTULO_CLASS}>Valor {finalidade === "locacao" ? "mensal " : ""}(R$)</span>
            <CampoMoeda name="valor_sugerido" defaultValue={inicial.valorSugerido} onValorChange={setValor} className={INPUT_CLASS} />
          </div>
          <p className="num text-xs text-ink-muted">
            {valor > 0 && areaM2 ? `Equivale a ${moedaM2(precoPorM2(valor, areaM2), finalidade)}.` : "Informe o valor para ver o preço por m²."} Valor
            calculado pela amostra: <strong className="text-ink">{moeda(valorCalculado, finalidade)}</strong>.
          </p>
          {(posicao === "abaixo" || posicao === "acima") && (
            <Aviso tom="alerta">
              O valor está {posicao} da faixa indicativa ({moeda(min, finalidade)} a {moeda(max, finalidade)}). Pode salvar assim; a diferença
              aparece no PDF e precisa estar justificada.
            </Aviso>
          )}
          <label className="block">
            <span className={ROTULO_CLASS}>
              Justificativa do valor{difereDoCalculado && <span className="text-brand"> * obrigatória (difere do calculado)</span>}
            </span>
            <textarea
              name="justificativa_valor"
              rows={3}
              defaultValue={inicial.justificativaValor}
              required={difereDoCalculado}
              placeholder="Por que este valor, e não o calculado?"
              className={INPUT_CLASS}
            />
          </label>
          {valorCalculado !== null && (
            <button type="submit" name="acao" value="usar_calculado" formNoValidate className={SECONDARY_BUTTON_CLASS}>
              Usar o valor calculado ({moeda(valorCalculado, finalidade)})
            </button>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 p-4">
          <p className="text-sm font-semibold text-ink">Faixa indicativa de mercado</p>
          <p className="num text-xs text-ink-muted">
            Calculada pela amostra: <strong className="text-ink">{moeda(faixaCalculadaMin, finalidade)}</strong> a{" "}
            <strong className="text-ink">{moeda(faixaCalculadaMax, finalidade)}</strong>.
          </p>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="faixa_manual" checked={faixaManual} onChange={(e) => setFaixaManual(e.target.checked)} className="mt-1 accent-brand" />
            Editar a faixa manualmente (exige justificativa e fica registrado)
          </label>
          {faixaManual && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={ROTULO_CLASS}>Mínimo (R$)</span>
                  <CampoMoeda name="faixa_min" defaultValue={inicial.faixaMin ?? faixaCalculadaMin} onValorChange={setFaixaMin} className={INPUT_CLASS} />
                </div>
                <div>
                  <span className={ROTULO_CLASS}>Máximo (R$)</span>
                  <CampoMoeda name="faixa_max" defaultValue={inicial.faixaMax ?? faixaCalculadaMax} onValorChange={setFaixaMax} className={INPUT_CLASS} />
                </div>
              </div>
              {faixaMin > 0 && faixaMax > 0 && faixaMin > faixaMax && <Aviso tom="bloqueio">O mínimo está maior que o máximo.</Aviso>}
              <label className="block">
                <span className={ROTULO_CLASS}>
                  Justificativa da faixa<span className="text-brand"> *</span>
                </span>
                <textarea name="justificativa_faixa" rows={3} required defaultValue={inicial.justificativaFaixa} className={INPUT_CLASS} />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={ROTULO_CLASS}>Margem de negociação (%) — opcional</span>
          <input name="margem_negociacao_pct" value={margem} onChange={(e) => setMargem(e.target.value)} inputMode="decimal" placeholder="Ex.: 5" className={INPUT_CLASS} />
          <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
            Só é aplicada se você lançar no valor sugerido.{" "}
            {comMargem !== null && `Valor calculado + ${margem}% = ${moeda(comMargem, finalidade)} (arredondado).`}
          </span>
        </label>
        <div>
          <span className={ROTULO_CLASS}>Valor pretendido pelo proprietário (R$) — opcional</span>
          <CampoMoeda name="valor_proprietario" defaultValue={inicial.valorProprietario} className={INPUT_CLASS} />
          <span className="mt-1 block text-[11px] leading-4 text-ink-muted">Fica registrado à parte; nunca substitui o valor calculado nem o sugerido.</span>
        </div>
      </div>

      <label className="block">
        <span className={ROTULO_CLASS}>Fundamentação do valor (vai para o PDF)</span>
        <textarea
          name="fundamentacao"
          rows={5}
          defaultValue={inicial.fundamentacao}
          placeholder="Explique, em texto, como a amostra e os ajustes levam a este valor."
          className={INPUT_CLASS}
        />
      </label>

      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…">
        Salvar precificação
      </BotaoEnviar>
    </form>
  );
}
