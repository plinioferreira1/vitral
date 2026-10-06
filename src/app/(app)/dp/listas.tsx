import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { Tables } from "@/lib/database.types";
import { dataBR, periodoBR } from "@/lib/ferias/regras";
import { decidirAusencia, excluirDocumento, salvarAusencia, salvarDocumento } from "./actions";
import { CampoArquivo } from "./campo-arquivo";
import type { ConfigDP } from "./dados";
import { ROTULO } from "./ui";

const TOM_AUSENCIA: Record<string, string> = { aprovada: "bg-emerald-50 text-emerald-800", pendente: "bg-amber-50 text-amber-800", recusada: "bg-rose-50 text-rose-800", cancelada: "bg-stone-100 text-stone-500" };
const ROTULO_AUSENCIA: Record<string, string> = { aprovada: "Registrada", pendente: "Aguardando confirmação", recusada: "Recusada", cancelada: "Cancelada" };

/** Formulário de ausência. Com `colaboradores`, mostra o seletor (gestão); sem, é o próprio colaborador enviando. */
export function FormAusencia({ config, colaboradores, colaboradorId, proprio }: { config: ConfigDP; colaboradores?: { id: string; nome: string }[]; colaboradorId?: string; proprio: boolean }) {
  return (
    <form action={salvarAusencia} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {colaboradores ? (
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className={ROTULO}>Colaborador</span>
          <select name="colaborador_id" required defaultValue={colaboradorId ?? ""} className={INPUT_CLASS}>
            <option value="">Selecione…</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="colaborador_id" value={colaboradorId} />
      )}
      <label className="block">
        <span className={ROTULO}>Tipo</span>
        <select name="tipo" required className={INPUT_CLASS}>
          {config.tiposAusencia
            .filter((t) => !proprio || t.abona)
            .map((t) => (
              <option key={t.nome}>{t.nome}</option>
            ))}
        </select>
      </label>
      <label className="block">
        <span className={ROTULO}>Data inicial</span>
        <input type="date" name="data_inicio" required className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Data final</span>
        <input type="date" name="data_fim" className={INPUT_CLASS} />
      </label>
      <label className="block sm:col-span-2 lg:col-span-3">
        <span className={ROTULO}>Observação</span>
        <input name="observacao" className={INPUT_CLASS} />
      </label>
      <div>
        <span className={ROTULO}>Anexo (atestado, declaração…)</span>
        <CampoArquivo destino="ausencia" colaboradorId={colaboradores ? undefined : colaboradorId} seletorColaborador={colaboradores ? "colaborador_id" : undefined} rotulo="Anexar" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Salvando…">
          {proprio ? "Enviar para o gestor" : "Registrar ausência"}
        </BotaoEnviar>
      </div>
    </form>
  );
}

export function ListaAusencias({ ausencias, nomes, podeDecidir, podeCancelar }: { ausencias: Tables<"dp_ausencias">[]; nomes?: Map<string, string>; podeDecidir: (a: Tables<"dp_ausencias">) => boolean; podeCancelar: (a: Tables<"dp_ausencias">) => boolean }) {
  if (ausencias.length === 0) return <p className="text-sm text-ink-muted">Nenhuma ausência registrada.</p>;
  return (
    <ul className="divide-y divide-border">
      {ausencias.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm text-ink">
              {nomes && <strong>{nomes.get(a.colaborador_id) ?? "—"} · </strong>}
              {a.tipo} · <span className="num">{a.data_inicio === a.data_fim ? dataBR(a.data_inicio) : periodoBR(a.data_inicio, a.data_fim)}</span>
            </p>
            <p className="text-xs text-ink-muted">
              {a.observacao ? `${a.observacao} · ` : ""}
              {a.abona ? "não gera falta" : "conta como falta"} · por {a.criado_por_nome ?? "—"}
              {a.anexo_caminho && (
                <>
                  {" · "}
                  <a href={`/dp/arquivo?tipo=ausencia&id=${a.id}`} target="_blank" rel="noreferrer" className="text-brand underline">
                    {a.anexo_nome ?? "anexo"}
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TOM_AUSENCIA[a.status]}`}>{ROTULO_AUSENCIA[a.status]}</span>
            {a.status === "pendente" && podeDecidir(a) && (
              <>
                {(["aprovar", "recusar"] as const).map((d) => (
                  <form key={d} action={decidirAusencia}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="decisao" value={d} />
                    <BotaoEnviar className={d === "aprovar" ? "rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white" : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted"} textoEnviando="…">
                      {d === "aprovar" ? "Confirmar" : "Recusar"}
                    </BotaoEnviar>
                  </form>
                ))}
              </>
            )}
            {a.status !== "cancelada" && a.status !== "recusada" && podeCancelar(a) && (
              <form action={decidirAusencia}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="decisao" value="cancelar" />
                <BotaoComConfirmacao className="text-xs text-rose-700 hover:underline" mensagem="Cancelar esta ausência? O ponto desses dias volta a ser contado normalmente." textoEnviando="…">
                  Cancelar
                </BotaoComConfirmacao>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FormDocumento({ config, colaboradores, colaboradorId }: { config: ConfigDP; colaboradores?: { id: string; nome: string }[]; colaboradorId?: string }) {
  return (
    <form action={salvarDocumento} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {colaboradores ? (
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className={ROTULO}>Colaborador</span>
          <select name="colaborador_id" required defaultValue={colaboradorId ?? ""} className={INPUT_CLASS}>
            <option value="">Selecione…</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="colaborador_id" value={colaboradorId} />
      )}
      <label className="block">
        <span className={ROTULO}>Categoria</span>
        <select name="categoria" required className={INPUT_CLASS}>
          {config.tiposDocumento.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={ROTULO}>Título</span>
        <input name="titulo" required placeholder="Ex.: Contrato de trabalho" className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Data do documento</span>
        <input type="date" name="data_documento" className={INPUT_CLASS} />
      </label>
      <label className="block">
        <span className={ROTULO}>Vencimento (opcional)</span>
        <input type="date" name="vencimento" className={INPUT_CLASS} />
      </label>
      <label className="block sm:col-span-2">
        <span className={ROTULO}>Observação</span>
        <input name="observacao" className={INPUT_CLASS} />
      </label>
      <div className="sm:col-span-2">
        <span className={ROTULO}>Arquivo</span>
        <CampoArquivo destino="documento" colaboradorId={colaboradores ? undefined : colaboradorId} seletorColaborador={colaboradores ? "colaborador_id" : undefined} rotulo="Escolher arquivo (PDF ou imagem)" obrigatorio />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Salvando…">
          Salvar documento
        </BotaoEnviar>
      </div>
    </form>
  );
}

export function ListaDocumentos({ documentos, nomes, hoje, alertaAte, podeExcluir }: { documentos: Tables<"dp_documentos">[]; nomes?: Map<string, string>; hoje: string; alertaAte: string; podeExcluir: boolean }) {
  if (documentos.length === 0) return <p className="text-sm text-ink-muted">Nenhum documento.</p>;
  return (
    <ul className="divide-y divide-border">
      {documentos.map((d) => {
        const vencido = !!d.vencimento && d.vencimento < hoje;
        const vencendo = !!d.vencimento && !vencido && d.vencimento <= alertaAte;
        return (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <a href={`/dp/arquivo?tipo=documento&id=${d.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:text-brand hover:underline">
                {d.titulo}
              </a>
              <p className="text-xs text-ink-muted">
                {nomes ? `${nomes.get(d.colaborador_id) ?? "—"} · ` : ""}
                {d.categoria}
                {d.data_documento ? ` · ${dataBR(d.data_documento)}` : ""}
                {d.observacao ? ` · ${d.observacao}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {d.vencimento && <span className={`num rounded-full px-2.5 py-0.5 text-xs font-medium ${vencido ? "bg-rose-50 text-rose-800" : vencendo ? "bg-amber-50 text-amber-800" : "bg-background text-ink-muted"}`}>{vencido ? "Venceu em" : "Vence em"} {dataBR(d.vencimento)}</span>}
              {podeExcluir && (
                <form action={excluirDocumento}>
                  <input type="hidden" name="id" value={d.id} />
                  <BotaoComConfirmacao className="text-xs text-rose-700 hover:underline" mensagem={`Excluir o documento "${d.titulo}"? O arquivo é apagado; a exclusão fica registrada no histórico.`} textoEnviando="…">
                    Excluir
                  </BotaoComConfirmacao>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Cartao({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      {titulo && <h2 className="mb-3 text-sm font-semibold text-ink">{titulo}</h2>}
      {children}
    </section>
  );
}
