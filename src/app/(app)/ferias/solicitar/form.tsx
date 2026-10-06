"use client";

import { useMemo, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { abonoMaximo, abonoPermitido, adiantamento13Aplicavel, calcularDatas, dataBR, dataValida, validarPedido, type Regime, type SaldoPeriodo } from "@/lib/ferias/regras";
import { solicitarFerias } from "../actions";

const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";

export function FormSolicitar({
  saldos,
  regime,
  diasPorPeriodo,
  hoje,
  origem,
  antecedenciaDias,
}: {
  antecedenciaDias: number;
  saldos: SaldoPeriodo[];
  regime: Regime;
  diasPorPeriodo: number;
  hoje: string;
  /** férias aprovadas que estão sendo alteradas */
  origem?: { id: string; periodoInicio: string; dataInicio: string; dias: number; abonoDias: number; resumo: string } | null;
}) {
  const disponiveis = saldos.filter((s) => s.adquirido && (s.disponivel > 0 || s.inicio === origem?.periodoInicio));
  const [periodo, setPeriodo] = useState(origem?.periodoInicio ?? disponiveis[0]?.inicio ?? "");
  const [inicio, setInicio] = useState(origem?.dataInicio ?? "");
  const [dias, setDias] = useState(String(origem?.dias ?? ""));
  const [abono, setAbono] = useState(String(origem?.abonoDias || ""));
  const [decimo, setDecimo] = useState(false);

  const nDias = Number(dias);
  const nAbono = Number(abono) || 0;
  const saldo = saldos.find((s) => s.inicio === periodo);
  const datas = dataValida(inicio) && Number.isInteger(nDias) && nDias > 0 ? calcularDatas(inicio, nDias) : null;
  const preenchido = !!periodo && dataValida(inicio) && Number.isInteger(nDias) && nDias > 0;
  const v = useMemo(
    () => validarPedido({ periodoInicio: periodo, dataInicio: inicio, dias: Number.isInteger(nDias) ? nDias : 0, abonoDias: nAbono, adiantamento13: decimo }, { hoje, regime, saldos, diasPorPeriodo, antecedenciaDias }),
    [periodo, inicio, nDias, nAbono, decimo, hoje, regime, saldos, diasPorPeriodo, antecedenciaDias]
  );
  const podeDecimo = adiantamento13Aplicavel(regime, inicio);

  return (
    <form action={solicitarFerias} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="tipo" value={origem ? "alteracao" : "ferias"} />
      {origem && <input type="hidden" name="origem_id" value={origem.id} />}

      <div className={`${CARD_CLASS} space-y-4 p-4 sm:p-6`}>
        {origem && <p className="rounded-lg bg-background px-3 py-2 text-xs text-ink-muted">Você está pedindo para alterar as férias já aprovadas de {origem.resumo}. Elas só mudam se o gestor aprovar.</p>}
        <label className="block">
          <span className={ROTULO}>Período aquisitivo</span>
          <select name="periodo_inicio" value={periodo} onChange={(e) => setPeriodo(e.target.value)} disabled={!!origem} className={`${INPUT_CLASS} disabled:opacity-70`}>
            {disponiveis.map((s) => (
              <option key={s.inicio} value={s.inicio}>
                {s.rotulo} — {s.disponivel} dia(s) disponíveis
              </option>
            ))}
          </select>
          {saldo && <span className="mt-1 block text-[11px] text-ink-muted">Use até {dataBR(saldo.limite)}.</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={ROTULO}>Data desejada de início</span>
            <input type="date" name="data_inicio" value={inicio} min={hoje} onChange={(e) => setInicio(e.target.value)} required className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className={ROTULO}>Quantidade de dias</span>
            <input type="number" name="dias" value={dias} min={1} max={diasPorPeriodo} onChange={(e) => setDias(e.target.value)} required className={`${INPUT_CLASS} num`} />
          </label>
          <div>
            <span className={ROTULO}>Data final</span>
            <p className="num rounded-lg bg-background px-3 py-2.5 text-sm text-ink">{datas ? dataBR(datas.fim) : "—"}</p>
          </div>
          <div>
            <span className={ROTULO}>Data prevista de retorno</span>
            <p className="num rounded-lg bg-background px-3 py-2.5 text-sm text-ink">{datas ? dataBR(datas.retorno) : "—"}</p>
          </div>
        </div>
        {abonoPermitido(regime) && (
          <label className="block sm:max-w-xs">
            <span className={ROTULO}>Vender dias (abono) — opcional</span>
            <input type="number" name="abono_dias" value={abono} min={0} max={abonoMaximo(diasPorPeriodo)} onChange={(e) => setAbono(e.target.value)} placeholder="0" className={`${INPUT_CLASS} num`} />
            <span className="mt-1 block text-[11px] text-ink-muted">Até {abonoMaximo(diasPorPeriodo)} dias. Os dias vendidos também saem do saldo.</span>
          </label>
        )}
        {regime === "clt" && (
          <label className={`flex items-start gap-2 text-sm ${podeDecimo ? "text-ink" : "text-ink-muted"}`}>
            <input type="checkbox" name="adiantamento_13" checked={decimo && podeDecimo} disabled={!podeDecimo} onChange={(e) => setDecimo(e.target.checked)} className="mt-1 accent-brand" />
            <span>
              Solicitar adiantamento da 1ª parcela do 13º
              <span className="block text-[11px] text-ink-muted">Disponível para férias iniciadas entre fevereiro e novembro.</span>
            </span>
          </label>
        )}
        <label className="block">
          <span className={ROTULO}>Observação (opcional)</span>
          <textarea name="observacao" rows={3} maxLength={1000} placeholder="Algo que ajude o gestor a analisar" className={INPUT_CLASS} />
        </label>
      </div>

      <aside className={`${CARD_CLASS} h-fit space-y-4 p-4 sm:p-5 lg:sticky lg:top-6`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Antes de enviar</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Saldo disponível</dt>
            <dd className="num font-semibold text-ink">{saldo ? `${saldo.disponivel} dias` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Dias que serão utilizados</dt>
            <dd className="num font-semibold text-ink">{preenchido ? `${nDias + nAbono} dias${nAbono ? ` (${nAbono} vendidos)` : ""}` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2">
            <dt className="text-ink-muted">Saldo restante após as férias</dt>
            <dd className={`num font-semibold ${v.saldoApos !== null && v.saldoApos < 0 ? "text-rose-700" : "text-ink"}`}>{preenchido && v.saldoApos !== null ? `${v.saldoApos} dias` : "—"}</dd>
          </div>
        </dl>
        {datas && (
          <p className="rounded-lg bg-background px-3 py-2 text-xs text-ink">
            Férias de <strong>{dataBR(inicio)}</strong> a <strong>{dataBR(datas.fim)}</strong>, com retorno em {dataBR(datas.retorno)}.
          </p>
        )}
        {preenchido && v.erros.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {v.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {preenchido && v.erros.length === 0 && v.avisos.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {v.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} w-full disabled:opacity-50`} disabled={!preenchido || v.erros.length > 0} textoEnviando="Enviando…">
          {origem ? "Enviar pedido de alteração" : "Enviar solicitação"}
        </BotaoEnviar>
        <p className="text-[11px] text-ink-muted">Depois de enviar, o pedido fica aguardando a análise do gestor.</p>
      </aside>
    </form>
  );
}
