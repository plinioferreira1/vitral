/* eslint-disable @next/next/no-img-element */
import { ArrowDown, ArrowUp } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { alertasDaAmostra, precoPorM2 } from "@/lib/avaliacao/calculo";
import { MODELO_CSV_COMPARAVEIS } from "@/lib/avaliacao/csv";
import { ROTULO_FONTE_TIPO, ROTULO_TIPO_PRECO, type Comparavel } from "@/lib/avaliacao/tipos";
import { hojeISO } from "@/lib/data-br";
import {
  alterarInclusaoComparavel,
  importarComparaveisCsv,
  importarComparaveisInternos,
  moverComparavel,
  removerComparavel,
  salvarComparavel,
  salvarEtapa,
} from "../../actions";
import type { AvaliacaoCompleta } from "../../dados";
import { AreaTexto, Aviso, Campo, Cartao, ROTULO_CLASS, Selecao, dataBR, moeda, moedaM2 } from "../../ui";
import { Uploader } from "../../uploader";

export type VendaInterna = {
  id: string;
  numero_processo: string;
  status: string;
  valor_total: number;
  data: string | null;
  endereco: string;
  regiao: string | null;
  area: string | null;
};

function CamposComparavel({ c, x, fontes }: { c: AvaliacaoCompleta; x?: Comparavel; fontes: string[] }) {
  const locacao = c.avaliacao.finalidade === "locacao";
  const idLista = `fontes-${x?.id ?? "novo"}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo label="Identificação" name="identificacao" defaultValue={x?.identificacao} required className="sm:col-span-2" placeholder="Edifício, endereço resumido ou título do anúncio" />
      <Campo label="Região / bairro" name="regiao" defaultValue={x?.regiao ?? c.avaliacao.bairro} />
      <Campo label="Área (m²)" name="area_m2" defaultValue={x?.area_m2 ? String(x.area_m2).replace(".", ",") : ""} inputMode="decimal" />
      <Campo label={locacao ? "Aluguel mensal (R$)" : "Preço (R$)"} name="preco" defaultValue={x?.preco ? String(x.preco).replace(".", ",") : ""} inputMode="decimal" />
      <Selecao
        label="Tipo de preço"
        name="tipo_preco"
        defaultValue={x?.tipo_preco ?? "oferta"}
        opcoes={[
          { valor: "oferta", rotulo: ROTULO_TIPO_PRECO.oferta },
          { valor: "transacao", rotulo: ROTULO_TIPO_PRECO.transacao },
        ]}
      />
      {c.avaliacao.tipologia === "residencial" && (
        <>
          <Campo label="Quartos" name="quartos" defaultValue={x?.quartos} inputMode="numeric" />
          <Campo label="Suítes" name="suites" defaultValue={x?.suites} inputMode="numeric" />
        </>
      )}
      {c.avaliacao.tipologia !== "terreno" && <Campo label="Vagas" name="vagas" defaultValue={x?.vagas} inputMode="numeric" />}
      <Selecao
        label="Origem"
        name="fonte_tipo"
        defaultValue={x?.fonte_tipo ?? "manual"}
        opcoes={[
          { valor: "manual", rotulo: ROTULO_FONTE_TIPO.manual },
          { valor: "externo", rotulo: ROTULO_FONTE_TIPO.externo },
          { valor: "interno", rotulo: ROTULO_FONTE_TIPO.interno },
        ]}
      />
      <label className="block">
        <span className={ROTULO_CLASS}>Nome da fonte</span>
        <input name="fonte_nome" defaultValue={x?.fonte_nome ?? ""} list={idLista} placeholder="Portal, imobiliária, base…" className={INPUT_CLASS} />
        <datalist id={idLista}>
          {fontes.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>
      <Campo label="Link (URL)" name="fonte_url" type="url" defaultValue={x?.fonte_url} placeholder="https://…" className="sm:col-span-2" />
      <Campo label="Referência interna / código" name="referencia_interna" defaultValue={x?.referencia_interna} />
      <Campo label="Data de consulta" name="data_coleta" type="date" defaultValue={x?.data_coleta ?? hojeISO()} />
      <Campo label="Data de atualização do anúncio" name="data_atualizacao" type="date" defaultValue={x?.data_atualizacao} />
      <Campo label="Situação" name="status_anuncio" defaultValue={x?.status_anuncio} placeholder="Anúncio ativo, vendido…" />
      <AreaTexto label="Diferenças relevantes em relação ao imóvel" name="diferencas" defaultValue={x?.diferencas} rows={2} className="sm:col-span-2" />
      <AreaTexto label="Observações internas" name="observacoes" defaultValue={x?.observacoes} rows={2} className="sm:col-span-2" />
    </div>
  );
}

export function EtapaComparaveis({
  c,
  tenantId,
  urls,
  vendasInternas,
}: {
  c: AvaliacaoCompleta;
  tenantId: string;
  urls: Record<string, string>;
  vendasInternas: VendaInterna[];
}) {
  const a = c.avaliacao;
  const d = a.dados;
  const fin = a.finalidade;
  const calc = c.conteudo.calculo;
  const alertas = alertasDaAmostra(c.comparaveis, {
    finalidade: fin,
    areaImovelM2: a.area_m2,
    bairro: a.bairro,
    tipologia: a.tipologia,
    dataBase: a.data_base,
    limiares: c.config.limiares,
  });
  const fontes = [...new Set([...c.config.fontesExternas.map((f) => f.nome), ...(c.comparaveis.map((x) => x.fonte_nome).filter(Boolean) as string[])])];
  const jaUsados = new Set(c.comparaveis.map((x) => x.referencia_interna));

  return (
    <div className="space-y-5">
      <form action={salvarEtapa}>
        <input type="hidden" name="avaliacao_id" value={a.id} />
        <input type="hidden" name="etapa" value="pesquisa" />
        <Cartao titulo="Recorte da pesquisa" descricao="Onde e quando a pesquisa foi feita. Vai para a página de método do PDF.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AreaTexto label="Recorte geográfico" name="recorte_geografico" defaultValue={d.recorte_geografico} rows={2} placeholder="Bairro, quadras, raio…" />
            <AreaTexto label="Período da pesquisa" name="recorte_periodo" defaultValue={d.recorte_periodo} rows={2} placeholder="Anúncios consultados entre … e …" />
            <AreaTexto label="Critérios de seleção" name="recorte_criterios" defaultValue={d.recorte_criterios} rows={2} placeholder="Tipo, faixa de área, vagas, padrão…" />
            <AreaTexto label="Justificativa de ampliação do recorte (outro bairro/RA)" name="ampliacao_justificativa" defaultValue={d.ampliacao_justificativa} rows={2} />
            <AreaTexto
              label={`Justificativa de amostra reduzida (menos de ${c.config.limiares.amostraMinima} comparáveis)`}
              name="amostra_justificativa"
              defaultValue={d.amostra_justificativa}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
          <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} mt-4`} textoEnviando="Salvando…">
            Salvar recorte
          </BotaoEnviar>
        </Cartao>
      </form>

      <Cartao
        titulo={`Comparáveis de ${fin === "venda" ? "venda" : "locação"}`}
        descricao={`Amostra inicial: ${calc.amostraInicial} · na amostra final: ${calc.amostraFinal} (${calc.ofertas} oferta(s), ${calc.transacoes} transação(ões)) · excluídos: ${calc.excluidos}. O ideal é de 3 a 6 referências pertinentes; menos que isso exige justificativa.`}
      >
        {c.comparaveis.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum comparável ainda. Use uma das três formas abaixo.</p>
        ) : (
          <ul className="space-y-3">
            {c.comparaveis.map((x, indice) => {
              const meus = alertas.filter((al) => al.comparavelId === x.id);
              const m2 = precoPorM2(x.preco, x.area_m2);
              return (
                <li key={x.id} className={`rounded-xl border p-3 sm:p-4 ${x.incluido ? "border-border/70" : "border-dashed border-border-strong bg-background/60"}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    {x.foto_caminho && urls[x.foto_caminho] && <img src={urls[x.foto_caminho]} alt="" className="h-16 w-24 rounded-md object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${x.incluido ? "text-ink" : "text-ink-muted line-through"}`}>{x.identificacao}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {[x.regiao, x.area_m2 ? `${x.area_m2.toLocaleString("pt-BR")} m²` : "sem área", ROTULO_TIPO_PRECO[x.tipo_preco]].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-0.5 break-words text-xs text-ink-muted">
                        {ROTULO_FONTE_TIPO[x.fonte_tipo]}
                        {x.fonte_nome ? `: ${x.fonte_nome}` : ""} · consulta em {dataBR(x.data_coleta)}
                        {x.fonte_url && (
                          <>
                            {" · "}
                            <a href={x.fonte_url} target="_blank" rel="noreferrer" className="text-brand underline">
                              abrir fonte
                            </a>
                          </>
                        )}
                        {x.referencia_interna ? ` · ref. ${x.referencia_interna}` : ""}
                      </p>
                      {!x.incluido && <p className="mt-1 text-xs text-rose-800">Excluído da amostra: {x.motivo_exclusao}</p>}
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-bold text-brand">{moeda(x.preco, fin)}</p>
                      <p className="num text-xs text-ink-muted">{moedaM2(m2, fin)}</p>
                    </div>
                  </div>

                  {meus.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {meus.map((al, i) => (
                        <Aviso key={i} tom="alerta">
                          {al.mensagem}
                        </Aviso>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <form action={moverComparavel} className="flex gap-1">
                      <input type="hidden" name="avaliacao_id" value={a.id} />
                      <input type="hidden" name="comparavel_id" value={x.id} />
                      <button type="submit" name="direcao" value="subir" disabled={indice === 0} aria-label="Subir" className="rounded-md border border-border p-1.5 text-ink-muted hover:text-ink disabled:opacity-30">
                        <ArrowUp size={13} />
                      </button>
                      <button type="submit" name="direcao" value="descer" disabled={indice === c.comparaveis.length - 1} aria-label="Descer" className="rounded-md border border-border p-1.5 text-ink-muted hover:text-ink disabled:opacity-30">
                        <ArrowDown size={13} />
                      </button>
                    </form>
                    <Uploader avaliacaoId={a.id} tenantId={tenantId} tipo="comparavel" comparavelId={x.id} multiplo={false} rotulo={x.foto_caminho ? "Trocar foto" : "Foto"} compacto />
                    {x.incluido ? null : (
                      <form action={alterarInclusaoComparavel}>
                        <input type="hidden" name="avaliacao_id" value={a.id} />
                        <input type="hidden" name="comparavel_id" value={x.id} />
                        <button type="submit" name="acao" value="incluir" className="rounded-md border border-border px-2.5 py-1.5 font-medium text-ink hover:bg-background">
                          Reincluir na amostra
                        </button>
                      </form>
                    )}
                  </div>

                  <details className="mt-3 rounded-lg border border-border/60 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Editar dados e fonte</summary>
                    <form action={salvarComparavel} className="mt-3 space-y-3">
                      <input type="hidden" name="avaliacao_id" value={a.id} />
                      <input type="hidden" name="comparavel_id" value={x.id} />
                      <CamposComparavel c={c} x={x} fontes={fontes} />
                      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…">
                        Salvar comparável
                      </BotaoEnviar>
                    </form>
                  </details>

                  {x.incluido && (
                    <details className="mt-2 rounded-lg border border-border/60 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Excluir da amostra (com justificativa)</summary>
                      <form action={alterarInclusaoComparavel} className="mt-3 space-y-3">
                        <input type="hidden" name="avaliacao_id" value={a.id} />
                        <input type="hidden" name="comparavel_id" value={x.id} />
                        <AreaTexto label="Por que este comparável sai da amostra?" name="motivo_exclusao" rows={2} placeholder="Duplicado, desatualizado, valor atípico, padrão diferente…" />
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input type="checkbox" name="duplicata" className="accent-brand" /> É duplicata de outro comparável
                        </label>
                        <button type="submit" name="acao" value="excluir" className={SECONDARY_BUTTON_CLASS}>
                          Excluir da amostra
                        </button>
                      </form>
                    </details>
                  )}

                  <form action={removerComparavel} className="mt-2 text-right">
                    <input type="hidden" name="avaliacao_id" value={a.id} />
                    <input type="hidden" name="comparavel_id" value={x.id} />
                    <button type="submit" className="text-xs text-rose-700 hover:underline">
                      Apagar do cadastro (lançado por engano)
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Adicionar comparáveis" descricao="Três origens. Em todas, a fonte e a data de consulta ficam registradas.">
        <div className="space-y-3">
          <details className="rounded-lg border border-border/70 px-4 py-3" open={c.comparaveis.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-ink">1. Lançar manualmente (anúncio ou negócio pesquisado)</summary>
            <form action={salvarComparavel} className="mt-4 space-y-3">
              <input type="hidden" name="avaliacao_id" value={a.id} />
              <CamposComparavel c={c} fontes={fontes} />
              <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Adicionando…">
                Adicionar comparável
              </BotaoEnviar>
            </form>
          </details>

          <details className="rounded-lg border border-border/70 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">2. Buscar na base interna do Vitral (vendas intermediadas)</summary>
            {fin !== "venda" ? (
              <p className="mt-3 text-sm text-ink-muted">A base interna tem valores de venda. Os aluguéis são controlados em outro sistema, então para locação use o lançamento manual ou a planilha.</p>
            ) : vendasInternas.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nenhuma venda com valor registrado na base.</p>
            ) : (
              <form action={importarComparaveisInternos} className="mt-4 space-y-3">
                <input type="hidden" name="avaliacao_id" value={a.id} />
                <p className="text-xs text-ink-muted">
                  Entram como <strong>transação confirmada</strong> (valor do processo). Confira a área: sem área o comparável não entra no cálculo. No PDF, a identificação pode ser editada para preservar o endereço.
                </p>
                <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border/70">
                  {vendasInternas.map((v) => (
                    <li key={v.id}>
                      <label className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-background ${jaUsados.has(v.numero_processo) ? "opacity-50" : ""}`}>
                        <input type="checkbox" name="processo_ids" value={v.id} disabled={jaUsados.has(v.numero_processo)} className="mt-1 accent-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{v.endereco}</span>
                          <span className="block text-xs text-ink-muted">
                            {[v.regiao, v.area ? `${v.area} m²` : "sem área cadastrada", v.status === "concluido" ? "concluído" : "em andamento", v.data ? dataBR(v.data) : null, v.numero_processo]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="num whitespace-nowrap text-sm font-semibold text-ink">{moeda(v.valor_total, "venda")}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Importando…">
                  Adicionar marcados
                </BotaoEnviar>
              </form>
            )}
          </details>

          <details className="rounded-lg border border-border/70 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">3. Importar planilha de fonte externa autorizada (CSV)</summary>
            <form action={importarComparaveisCsv} className="mt-4 space-y-3">
              <input type="hidden" name="avaliacao_id" value={a.id} />
              <p className="text-xs leading-5 text-ink-muted">
                Para dados exportados de um portal ou serviço que a Sacra tem autorização para usar. O Vitral não faz busca automática em sites: ele só lê a planilha. Cabeçalho aceito:
              </p>
              <code className="block overflow-x-auto rounded-md bg-background px-3 py-2 text-[11px] text-ink">{MODELO_CSV_COMPARAVEIS}</code>
              <label className="block">
                <span className={ROTULO_CLASS}>Fonte da planilha *</span>
                <input name="fonte_nome" required list="fontes-csv" placeholder="Nome do portal ou serviço" className={INPUT_CLASS} />
                <datalist id="fontes-csv">
                  {c.config.fontesExternas.map((f) => (
                    <option key={f.nome} value={f.nome} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className={ROTULO_CLASS}>Arquivo CSV</span>
                <input type="file" name="arquivo" accept=".csv,text/csv,text/plain" className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm" />
              </label>
              <AreaTexto label="…ou cole o conteúdo aqui" name="csv" rows={4} placeholder={`${MODELO_CSV_COMPARAVEIS}\nEd. Exemplo, ap. 101;Águas Claras;72;3;1;1;665000;oferta;https://…;20/09/2026;ativo;`} />
              <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Importando…">
                Importar planilha
              </BotaoEnviar>
            </form>
          </details>
        </div>
      </Cartao>
    </div>
  );
}
