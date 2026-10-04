import Link from "next/link";
import { ExternalLink, FileDown } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { alertasDaAmostra, precoPorM2 } from "@/lib/avaliacao/calculo";
import { podeAprovar, type PapelAvaliacao } from "@/lib/avaliacao/permissoes";
import { ETAPAS_EDITOR, MODALIDADES, ROTULO_FINALIDADE, ROTULO_MODALIDADE, ROTULO_MODALIDADE_CURTO, ROTULO_VISTORIA } from "@/lib/avaliacao/tipos";
import type { ResultadoValidacao } from "@/lib/avaliacao/validacao";
import { formatarDataHoraBR } from "@/lib/data-br";
import type { Tables } from "@/lib/database.types";
import { aprovarAvaliacao, arquivarAvaliacao, devolverParaAjustes, duplicarAvaliacao, emitirVersao, enviarParaRevisao } from "../../actions";
import type { AvaliacaoCompleta } from "../../dados";
import { Aviso, Cartao, ROTULO_CLASS, dataBR, moeda, moedaM2 } from "../../ui";

const rotuloEtapa = (chave: string) => ETAPAS_EDITOR.find((e) => e.chave === chave)?.rotulo ?? chave;

export function EtapaRevisao({
  c,
  papel,
  validacao,
  temAssinatura,
}: {
  c: AvaliacaoCompleta;
  papel: PapelAvaliacao;
  validacao: ResultadoValidacao;
  temAssinatura: boolean;
}) {
  const a = c.avaliacao;
  const fin = a.finalidade;
  const calc = c.conteudo.calculo;
  const p = c.conteudo.precificacao;
  const ptam = a.modalidade === "ptam";
  const aprova = podeAprovar(papel, a.modalidade);
  const responsavel = c.config.responsavel.nome || "a avaliadora responsável";
  const alertas = alertasDaAmostra(c.comparaveis, {
    finalidade: fin,
    areaImovelM2: a.area_m2,
    bairro: a.bairro,
    tipologia: a.tipologia,
    dataBase: a.data_base,
    limiares: c.config.limiares,
  });
  const incluidos = c.comparaveis.filter((x) => x.incluido);
  const urlPdf = `/avaliacoes/${a.id}/pdf`;

  return (
    <div className="space-y-5">
      <Cartao titulo="Conferência antes de emitir" descricao="Pendências impedem a emissão (o rascunho continua salvo). Alertas só pedem atenção.">
        {validacao.bloqueios.length === 0 ? (
          <Aviso tom="info">Nenhuma pendência: o documento pode seguir para aprovação e emissão.</Aviso>
        ) : (
          <ul className="space-y-2">
            {validacao.bloqueios.map((b, i) => (
              <li key={i}>
                <Aviso tom="bloqueio">
                  <Link href={`/avaliacoes/${a.id}?etapa=${b.etapa}`} className="font-semibold underline">
                    {rotuloEtapa(b.etapa)}
                  </Link>
                  : {b.mensagem}
                </Aviso>
              </li>
            ))}
          </ul>
        )}
        {validacao.alertas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {validacao.alertas.map((al, i) => (
              <li key={i}>
                <Aviso tom="alerta">
                  <Link href={`/avaliacoes/${a.id}?etapa=${al.etapa}`} className="font-semibold underline">
                    {rotuloEtapa(al.etapa)}
                  </Link>
                  : {al.mensagem}
                </Aviso>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Resumo para revisão" descricao="Os mesmos números que saem no PDF.">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Documento", ROTULO_MODALIDADE[a.modalidade]],
            ["Finalidade", `${ROTULO_FINALIDADE[fin]}${fin === "locacao" ? " (valores mensais)" : ""}`],
            ["Data-base", dataBR(a.data_base)],
            ["Imóvel", `${a.titulo}${a.area_m2 ? ` · ${a.area_m2.toLocaleString("pt-BR")} m²` : ""}`],
            ["Vistoria", `${ROTULO_VISTORIA[a.dados.vistoria_status ?? "nao_realizada"]}${a.dados.vistoria_data ? ` em ${dataBR(a.dados.vistoria_data)}` : ""}`],
            ["Amostra", `${calc.amostraFinal} de ${calc.amostraInicial} (${calc.ofertas} oferta(s), ${calc.transacoes} transação(ões))`],
            ["Mediana ajustada", moedaM2(calc.ajustado?.mediana ?? null, fin)],
            ["Valor calculado", moeda(p.valor_calculado, fin)],
            ["Faixa indicativa", `${moeda(p.faixa_min, fin)} a ${moeda(p.faixa_max, fin)}${p.faixa_manual ? " (editada)" : ""}`],
            [ptam ? "Valor de avaliação" : "Valor sugerido", `${moeda(p.valor_sugerido, fin)}${precoPorM2(p.valor_sugerido, a.area_m2) ? ` · ${moedaM2(precoPorM2(p.valor_sugerido, a.area_m2), fin)}` : ""}`],
            ["Margem de negociação", p.margem_negociacao_pct ? `${p.margem_negociacao_pct.toLocaleString("pt-BR")}%` : "—"],
            ["Valor pretendido pelo proprietário", moeda(p.valor_proprietario, fin)],
          ].map(([rot, valor]) => (
            <div key={rot}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rot}</dt>
              <dd className="num mt-0.5 text-ink">{valor}</dd>
            </div>
          ))}
        </dl>

        {(p.justificativa_valor || p.justificativa_faixa) && (
          <div className="mt-4 space-y-2">
            {p.justificativa_valor && <Aviso tom="info">Justificativa do valor: {p.justificativa_valor}</Aviso>}
            {p.justificativa_faixa && <Aviso tom="info">Justificativa da faixa: {p.justificativa_faixa}</Aviso>}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-border text-ink-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Comparável</th>
                <th className="py-2 pr-3 font-medium">Fonte · consulta</th>
                <th className="py-2 pr-3 font-medium">Ajustes</th>
                <th className="py-2 text-right font-medium">R$/m² ajustado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {incluidos.map((x) => {
                const linha = calc.amostra.find((l) => l.id === x.id);
                return (
                  <tr key={x.id}>
                    <td className="py-2 pr-3 text-ink">
                      {x.identificacao}
                      <span className="block text-ink-muted">{x.tipo_preco === "transacao" ? "transação confirmada" : "oferta"}</span>
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {x.fonte_nome ?? "—"} · {dataBR(x.data_coleta)}
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {x.ajustes.length ? x.ajustes.map((aj) => `${aj.fator} ${aj.percentual > 0 ? "+" : ""}${aj.percentual}%`).join("; ") : "—"}
                    </td>
                    <td className="num py-2 text-right font-semibold text-ink">{linha ? moedaM2(linha.m2Ajustado, fin) : "fora do cálculo"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {alertas.length > 0 && (
          <p className="mt-3 text-xs text-amber-800">
            {alertas.length} alerta(s) de qualidade da amostra —{" "}
            <Link href={`/avaliacoes/${a.id}?etapa=comparaveis`} className="underline">
              ver nos comparáveis
            </Link>
            .
          </p>
        )}
      </Cartao>

      <Cartao
        titulo="Prévia do PDF"
        descricao={a.status === "emitido" ? "A prévia mostra o conteúdo atual; as versões emitidas estão no Histórico." : "A prévia leva a marca d'água RASCUNHO e não tem assinatura."}
        acao={
          <a href={urlPdf} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON_CLASS}>
            <ExternalLink size={15} /> Abrir prévia em nova aba
          </a>
        }
      >
        <iframe src={urlPdf} title="Prévia do PDF" className="hidden h-[820px] w-full rounded-lg border border-border md:block" />
        <p className="text-sm text-ink-muted md:hidden">No celular, abra a prévia em nova aba para ler o PDF em tela cheia.</p>
      </Cartao>

      <Cartao titulo="Aprovação e emissão">
        <div className="space-y-4 text-sm text-ink">
          <p className="text-ink-muted">
            {ptam
              ? `O PTAM é aprovado, assinado e emitido pessoalmente por ${responsavel}. A aprovação vale para o conteúdo exato; qualquer alteração depois dela exige nova revisão.`
              : `O estudo comercial é aprovado por diretor ou gerente (ou por ${responsavel}). A assinatura da avaliadora só aparece se ela mesma aprovar e emitir.`}
          </p>

          {a.status === "rascunho" && (
            <div className="flex flex-wrap gap-2">
              <form action={enviarParaRevisao}>
                <input type="hidden" name="avaliacao_id" value={a.id} />
                <BotaoEnviar className={aprova ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS} textoEnviando="Enviando…">
                  Enviar para revisão
                </BotaoEnviar>
              </form>
              {aprova && (
                <form action={aprovarAvaliacao}>
                  <input type="hidden" name="avaliacao_id" value={a.id} />
                  <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Aprovando…">
                    Aprovar este conteúdo
                  </BotaoEnviar>
                </form>
              )}
            </div>
          )}

          {a.status === "em_revisao" &&
            (aprova ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form action={aprovarAvaliacao} className="space-y-3 rounded-xl border border-border/70 p-4">
                  <input type="hidden" name="avaliacao_id" value={a.id} />
                  <p className="font-semibold">Aprovar</p>
                  <label className="block">
                    <span className={ROTULO_CLASS}>Comentário (opcional)</span>
                    <textarea name="comentario" rows={2} className={INPUT_CLASS} />
                  </label>
                  <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Aprovando…">
                    Aprovar este conteúdo
                  </BotaoEnviar>
                </form>
                <form action={devolverParaAjustes} className="space-y-3 rounded-xl border border-border/70 p-4">
                  <input type="hidden" name="avaliacao_id" value={a.id} />
                  <p className="font-semibold">Devolver para ajustes</p>
                  <label className="block">
                    <span className={ROTULO_CLASS}>O que precisa ser ajustado *</span>
                    <textarea name="comentario" rows={2} required className={INPUT_CLASS} />
                  </label>
                  <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Devolvendo…">
                    Devolver
                  </BotaoEnviar>
                </form>
              </div>
            ) : (
              <Aviso tom="info">Aguardando a revisão de {ptam ? responsavel : "um diretor ou gerente"}.</Aviso>
            ))}

          {a.status === "aprovado" &&
            (aprova ? (
              <div className="space-y-3">
                <Aviso tom="info">
                  Aprovado em {c.linha.aprovado_em ? formatarDataHoraBR(c.linha.aprovado_em) : "—"}. A emissão cria a versão {a.versao_atual + 1}, imutável, com o PDF definitivo.
                  {papel.ehResponsavelTecnica && c.linha.aprovado_por === papel.usuarioId
                    ? temAssinatura
                      ? " A sua assinatura (imagem) será aplicada."
                      : " Você ainda não cadastrou a assinatura."
                    : !ptam
                      ? " Este documento sai sem a assinatura da avaliadora (aprovação registrada eletronicamente)."
                      : ""}
                </Aviso>
                {papel.ehResponsavelTecnica && !temAssinatura && (
                  <Aviso tom={ptam ? "bloqueio" : "alerta"}>
                    <Link href="/avaliacoes/configuracao" className="font-semibold underline">
                      Cadastrar a assinatura
                    </Link>{" "}
                    {ptam ? "é necessário para emitir o PTAM." : "se quiser que ela apareça neste documento."}
                  </Aviso>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={emitirVersao}>
                    <input type="hidden" name="avaliacao_id" value={a.id} />
                    <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Emitindo…">
                      <FileDown size={15} /> Emitir versão {a.versao_atual + 1}
                    </BotaoEnviar>
                  </form>
                </div>
                <details className="rounded-lg border border-border/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Devolver para ajustes</summary>
                  <form action={devolverParaAjustes} className="mt-3 space-y-3">
                    <input type="hidden" name="avaliacao_id" value={a.id} />
                    <textarea name="comentario" rows={2} required placeholder="O que precisa ser ajustado" className={INPUT_CLASS} />
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Devolvendo…">
                      Devolver
                    </BotaoEnviar>
                  </form>
                </details>
              </div>
            ) : (
              <Aviso tom="info">Aprovado. Aguardando a emissão por {ptam ? responsavel : "quem aprovou"}.</Aviso>
            ))}

          {a.status === "emitido" && (
            <Aviso tom="info">
              Versão {a.versao_atual} emitida.{" "}
              <Link href={`/avaliacoes/${a.id}?etapa=historico`} className="font-semibold underline">
                Ver no histórico
              </Link>
              . Editar qualquer dado abre uma nova revisão; a versão emitida continua guardada sem alteração.
            </Aviso>
          )}

          {a.status === "arquivado" && <Aviso tom="info">Avaliação arquivada. Reabra no Histórico para editar.</Aviso>}
        </div>
      </Cartao>
    </div>
  );
}

// ---------------------------------------------------------------

const ROTULO_EVENTO: Record<string, string> = {
  anterior: "Anterior",
  novo: "Novo",
  calculado: "Calculado",
  calculada: "Calculada",
  justificativa: "Justificativa",
  motivo: "Motivo",
  comentario: "Comentário",
  campos: "Campos",
  fator: "Fator",
  percentual: "Percentual (%)",
  origem: "Origem",
  versao: "Versão",
  assinatura: "Assinatura",
  preco: "Preço",
  area_m2: "Área (m²)",
  fonte: "Fonte",
  link: "Link",
  status_anterior: "Situação anterior",
};

function valorEvento(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (Array.isArray(valor)) return valor.map(valorEvento).join(" a ");
  if (typeof valor === "number") return valor.toLocaleString("pt-BR");
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  return String(valor);
}

export function EtapaHistorico({
  c,
  versoes,
  eventos,
}: {
  c: AvaliacaoCompleta;
  versoes: Tables<"avaliacao_versoes">[];
  eventos: Tables<"avaliacao_eventos">[];
}) {
  const a = c.avaliacao;
  const fin = a.finalidade;
  return (
    <div className="space-y-5">
      <Cartao titulo="Versões emitidas" descricao="Cada emissão guarda o conteúdo exato e o PDF. Nenhuma versão é alterada ou apagada.">
        {versoes.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma versão emitida ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {versoes.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    Versão {v.numero} · {ROTULO_MODALIDADE_CURTO[v.modalidade as keyof typeof ROTULO_MODALIDADE_CURTO] ?? v.modalidade} · {ROTULO_FINALIDADE[v.finalidade as keyof typeof ROTULO_FINALIDADE] ?? v.finalidade}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Emitida em {formatarDataHoraBR(v.emitido_em)} por {v.emitido_por_nome ?? "—"} · aprovada por {v.aprovado_por_nome ?? "—"} ·{" "}
                    {v.tipo_assinatura === "visual" ? "assinatura visual da avaliadora" : "sem assinatura (aprovação eletrônica)"}
                  </p>
                  <p className="num mt-0.5 text-xs text-ink-muted">
                    Calculado {moeda(v.valor_calculado === null ? null : Number(v.valor_calculado), fin)} · sugerido{" "}
                    <strong className="text-ink">{moeda(v.valor_sugerido === null ? null : Number(v.valor_sugerido), fin)}</strong> · faixa{" "}
                    {moeda(v.faixa_min === null ? null : Number(v.faixa_min), fin)} a {moeda(v.faixa_max === null ? null : Number(v.faixa_max), fin)}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[10px] text-ink-muted">hash {v.hash_conteudo.slice(0, 24)}…</p>
                </div>
                <a href={`/avaliacoes/${a.id}/versoes/${v.numero}/pdf`} target="_blank" rel="noreferrer" className={PRIMARY_BUTTON_CLASS}>
                  <FileDown size={15} /> PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Reavaliar ou arquivar">
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={duplicarAvaliacao} className="space-y-3 rounded-xl border border-border/70 p-4">
            <input type="hidden" name="avaliacao_id" value={a.id} />
            <p className="text-sm font-semibold text-ink">Duplicar para reavaliação</p>
            <p className="text-xs leading-5 text-ink-muted">Copia os dados e os comparáveis para uma nova avaliação, com data-base de hoje. Os comparáveis ficam marcados para reconferência; vistoria e fotos não são copiadas.</p>
            <label className="block">
              <span className={ROTULO_CLASS}>Documento da nova avaliação</span>
              <select name="modalidade" defaultValue={a.modalidade} className={INPUT_CLASS}>
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>
                    {ROTULO_MODALIDADE[m]}
                  </option>
                ))}
              </select>
            </label>
            <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Duplicando…">
              Duplicar
            </BotaoEnviar>
          </form>
          <form action={arquivarAvaliacao} className="space-y-3 rounded-xl border border-border/70 p-4">
            <input type="hidden" name="avaliacao_id" value={a.id} />
            <p className="text-sm font-semibold text-ink">{a.status === "arquivado" ? "Reabrir" : "Arquivar"}</p>
            <p className="text-xs leading-5 text-ink-muted">
              {a.status === "arquivado" ? "Volta a ser um rascunho editável." : "Sai da lista principal e deixa de ser editável. As versões emitidas continuam disponíveis."}
            </p>
            <button type="submit" name="acao" value={a.status === "arquivado" ? "reabrir" : "arquivar"} className={SECONDARY_BUTTON_CLASS}>
              {a.status === "arquivado" ? "Reabrir como rascunho" : "Arquivar"}
            </button>
          </form>
        </div>
      </Cartao>

      <Cartao titulo="Trilha de alterações" descricao="Quem fez o quê e quando. Este registro só recebe novas entradas; nada é editado ou apagado.">
        {eventos.length === 0 ? (
          <p className="text-sm text-ink-muted">Sem registros.</p>
        ) : (
          <ol className="space-y-3">
            {eventos.map((e) => {
              const dados = (e.dados ?? {}) as Record<string, unknown>;
              const detalhes = Object.entries(dados).filter(([chave, valor]) => ROTULO_EVENTO[chave] && valor !== null && valor !== "" && !(Array.isArray(valor) && valor.length === 0));
              return (
                <li key={e.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm text-ink">{e.descricao}</p>
                  <p className="text-xs text-ink-muted">
                    {e.autor_nome ?? "—"} · {formatarDataHoraBR(e.criado_em)}
                  </p>
                  {detalhes.length > 0 && (
                    <dl className="mt-1 grid gap-x-4 text-xs text-ink-muted sm:grid-cols-2">
                      {detalhes.map(([chave, valor]) => (
                        <div key={chave} className="flex gap-1">
                          <dt className="font-medium">{ROTULO_EVENTO[chave]}:</dt>
                          <dd className="num min-w-0 break-words">{valorEvento(valor)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Cartao>
    </div>
  );
}
