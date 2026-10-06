"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { ROTULO_STATUS, type StatusVerificacao, type TipoVerificacao } from "@/lib/debitos/regras";
import { registrarConferencia } from "../actions";
import { CampoAnexo } from "./campo-anexo";

const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";

export function FormConferencia({
  contratoId,
  tenantId,
  tipo,
  competencia,
  statusAtual,
  observacao,
  debitosLancados,
}: {
  contratoId: string;
  tenantId: string;
  tipo: TipoVerificacao;
  competencia: string;
  statusAtual: StatusVerificacao | null;
  observacao: string | null;
  debitosLancados: number;
}) {
  const [status, setStatus] = useState<StatusVerificacao | "">(statusAtual && statusAtual !== "pendente" ? statusAtual : "");
  const opcoes: StatusVerificacao[] =
    tipo === "condominio" ? ["sem_debitos", "com_debitos", "aguardando_administradora", "nao_se_aplica", "pendente"] : ["sem_debitos", "com_debitos", "nao_se_aplica", "pendente"];
  const iptu = tipo === "iptu_tlp";

  return (
    <form action={registrarConferencia} className="space-y-3">
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="competencia" value={competencia} />

      <fieldset>
        <legend className={ROTULO}>Resultado da conferência</legend>
        <div className="flex flex-wrap gap-2">
          {opcoes.map((o) => (
            <label
              key={o}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${
                status === o ? (o === "com_debitos" ? "border-rose-300 bg-rose-50 text-rose-800" : "border-brand bg-brand-soft/50 text-brand") : "border-border/80 bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              <input type="radio" name="status" value={o} checked={status === o} onChange={() => setStatus(o)} className="sr-only" />
              {o === "pendente" ? "Voltar a pendente" : ROTULO_STATUS[o]}
            </label>
          ))}
        </div>
      </fieldset>

      {status === "com_debitos" && (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
          <p className="text-xs font-semibold text-rose-800">{debitosLancados > 0 ? "Lançar mais um débito (opcional)" : "Dados do débito"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {iptu && (
              <>
                <label className="block">
                  <span className={ROTULO}>Exercício</span>
                  <input name="debito_referencia" inputMode="numeric" placeholder={competencia.slice(0, 4)} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Parcela</span>
                  <input name="debito_parcela" placeholder="Ex.: 3/6 ou cota única" className={INPUT_CLASS} />
                </label>
              </>
            )}
            <label className="block">
              <span className={ROTULO}>Valor (R$)</span>
              <input name="debito_valor" inputMode="decimal" placeholder="0,00" className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className={ROTULO}>Vencimento</span>
              <input name="debito_vencimento" type="date" className={INPUT_CLASS} />
            </label>
            {!iptu && (
              <label className="block">
                <span className={ROTULO}>Competência do débito</span>
                <input name="debito_referencia" placeholder="Ex.: 09/2026" className={INPUT_CLASS} />
              </label>
            )}
            {iptu ? (
              <label className="block sm:col-span-2">
                <span className={ROTULO}>Situação</span>
                <input name="debito_situacao" placeholder="Em aberto, dívida ativa, parcelado…" className={INPUT_CLASS} />
              </label>
            ) : (
              <label className="block">
                <span className={ROTULO}>Descrição</span>
                <input name="debito_descricao" placeholder="Cota ordinária, multa…" className={INPUT_CLASS} />
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className={ROTULO}>Observação do débito</span>
              <input name="debito_observacao" className={INPUT_CLASS} />
            </label>
            <div className="sm:col-span-2">
              <span className={ROTULO}>{iptu ? "Anexo do DAR (opcional)" : "Documento ou boleto (opcional)"}</span>
              <CampoAnexo tenantId={tenantId} contratoId={contratoId} rotulo={iptu ? "Anexar DAR" : "Anexar documento"} />
            </div>
          </div>
        </div>
      )}

      <label className="block">
        <span className={ROTULO}>Observação da conferência (opcional)</span>
        <input name="observacao" defaultValue={observacao ?? ""} className={INPUT_CLASS} />
      </label>

      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Registrando…" disabled={!status}>
        Registrar conferência
      </BotaoEnviar>
    </form>
  );
}
