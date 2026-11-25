"use client";

import { useActionState, useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { gerenciarLinkAssinatura, type ResultadoLink } from "@/lib/assinaturas/actions";
import {
  EXPLICACAO_SITUACAO,
  formatarValidade,
  situacaoLink,
  type TipoLink,
} from "@/lib/assinaturas/link";
import { SeloSituacaoLink } from "@/components/selo-situacao-link";
import { LinkAjuda } from "@/components/link-ajuda";

type Props = {
  tipo: TipoLink;
  documentoId: string;
  signatarioId: string;
  nome: string;
  assinadoEm: string | null;
  expiraEm: string | null;
  revogadoEm: string | null;
  documentoAberto: boolean;
};

const BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-border-strong hover:bg-background sm:min-h-9";

/** "AAAA-MM-DDTHH:mm" no horário de quem está usando, para o campo datetime-local. */
function paraCampoLocal(data: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}T${p(data.getHours())}:${p(data.getMinutes())}`;
}

/**
 * Botão "Gerenciar link" + janela com a situação do link, a validade e a
 * revogação (com confirmação). Só é renderizado para gerentes e diretores;
 * o servidor e o banco conferem a permissão de novo.
 */
export function GerenciarLinkAssinatura(props: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  // Fica aqui (e não no conteúdo) para a mensagem sobreviver à atualização da página.
  const [resultado, enviar, enviando] = useActionState<ResultadoLink | null, FormData>(gerenciarLinkAssinatura, null);

  function abrir() {
    setAberto(true);
    ref.current?.showModal();
  }
  function fechar() {
    ref.current?.close();
  }

  return (
    <>
      <button type="button" onClick={abrir} className={BOTAO}>
        <Link2 size={14} aria-hidden="true" /> Gerenciar link
      </button>
      <dialog
        ref={ref}
        onClose={() => setAberto(false)}
        onClick={(e) => {
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby={`link-${props.signatarioId}-titulo`}
        className="app-content m-auto max-h-[calc(100dvh-2rem)] w-[min(94vw,480px)] overflow-hidden rounded-2xl border border-border bg-surface p-0 text-left shadow-2xl backdrop:bg-black/45"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={`link-${props.signatarioId}-titulo`} className="font-semibold text-ink">
              Link de assinatura
            </h2>
            <p className="truncate text-xs text-ink-muted">{props.nome}</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-5">
          {aberto && (
            <ConteudoLink
              key={`${props.expiraEm}-${props.revogadoEm}-${props.assinadoEm}`}
              {...props}
              fechar={fechar}
              resultado={resultado}
              enviar={enviar}
              enviando={enviando}
            />
          )}
        </div>
      </dialog>
    </>
  );
}

type Envio = {
  fechar: () => void;
  resultado: ResultadoLink | null;
  enviar: (form: FormData) => void;
  enviando: boolean;
};

function ConteudoLink(props: Props & Envio) {
  const { resultado, enviar, enviando } = props;
  const [confirmando, setConfirmando] = useState(false);
  const situacao = situacaoLink(props);
  const valido = situacao === "valido";

  // Calculados uma vez, ao abrir a janela: sugestão = validade atual ou daqui a 7 dias.
  const [minimo] = useState(() => paraCampoLocal(new Date()));
  const [local, setLocal] = useState(() => {
    const agora = new Date();
    const atual = props.expiraEm ? new Date(props.expiraEm) : null;
    return paraCampoLocal(atual && atual > agora ? atual : new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000));
  });
  const iso = (() => {
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  })();

  const ocultos = (
    <>
      <input type="hidden" name="tipo" value={props.tipo} />
      <input type="hidden" name="documento_id" value={props.documentoId} />
      <input type="hidden" name="signatario_id" value={props.signatarioId} />
    </>
  );

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-1.5">
        <SeloSituacaoLink situacao={situacao} />
        <p className="text-ink-muted">{EXPLICACAO_SITUACAO[situacao]}</p>
        {situacao !== "assinado" && (
          <p className="text-ink">
            <span className="text-ink-muted">Validade: </span>
            {formatarValidade(props.expiraEm)}
          </p>
        )}
      </div>

      {resultado && (
        <p
          role={resultado.ok ? "status" : "alert"}
          className={`rounded-lg px-3 py-2 text-sm ${resultado.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          {resultado.mensagem}
        </p>
      )}

      {valido && !confirmando && (
        <form action={enviar} className="space-y-2">
          {ocultos}
          <input type="hidden" name="acao" value="definir_validade" />
          <input type="hidden" name="expira_em" value={iso} />
          <label htmlFor={`validade-${props.signatarioId}`} className="block font-medium text-ink">
            Link vale até
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`validade-${props.signatarioId}`}
              type="datetime-local"
              required
              value={local}
              min={minimo}
              onChange={(e) => setLocal(e.target.value)}
              className="min-h-11 min-w-0 flex-1 basis-52 rounded-lg border border-border bg-surface px-3 text-base text-ink sm:text-sm"
            />
            <button
              type="submit"
              disabled={enviando}
              className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            >
              {enviando ? "Salvando…" : "Salvar validade"}
            </button>
          </div>
          <p className="text-xs text-ink-muted">Horário de Brasília. Depois desse momento o link deixa de abrir o documento.</p>
        </form>
      )}

      {valido && (
        <div className="border-t border-border pt-4">
          {!confirmando ? (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="min-h-11 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Revogar link
            </button>
          ) : (
            <form action={enviar} className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
              {ocultos}
              <input type="hidden" name="acao" value="revogar" />
              <input type="hidden" name="confirmado" value="sim" />
              <p className="text-rose-800">
                Revogar o link de <strong>{props.nome}</strong>? Ele deixa de abrir o documento na hora e não pode ser
                reativado. As assinaturas já feitas continuam valendo.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="min-h-11 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  {enviando ? "Revogando…" : "Sim, revogar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={enviando}
                  className="min-h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink"
                >
                  Voltar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <LinkAjuda slug="gerenciar-link-de-assinatura" rotulo="Como funciona" />

      {!valido && (
        <button type="button" onClick={props.fechar} className="min-h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink">
          Fechar
        </button>
      )}
    </div>
  );
}
