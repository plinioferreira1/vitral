import { MemoriaCalculo } from "../../memoria-calculo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { passoArredondamento } from "@/lib/avaliacao/calculo";
import { FATORES_AJUSTE } from "@/lib/avaliacao/tipos";
import { adicionarAjuste, removerAjuste } from "../../actions";
import type { AvaliacaoCompleta } from "../../dados";
import { FormPreco } from "../../form-preco";
import { Aviso, Cartao, ROTULO_CLASS, dataBR, moeda, moedaM2 } from "../../ui";

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-border/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rotulo}</p>
      <p className="num mt-1 text-lg font-bold text-ink">{valor}</p>
      {nota && <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">{nota}</p>}
    </div>
  );
}

export function EtapaPreco({ c }: { c: AvaliacaoCompleta }) {
  const a = c.avaliacao;
  const fin = a.finalidade;
  const calc = c.conteudo.calculo;
  const e = calc.ajustado;
  const ptam = a.modalidade === "ptam";
  const rotuloValor = ptam
    ? fin === "venda"
      ? "Valor de avaliação para venda"
      : "Valor de avaliação para locação (mensal)"
    : fin === "venda"
      ? "Valor sugerido de anúncio"
      : "Valor sugerido de locação (mensal)";

  return (
    <div className="space-y-5">
      <Cartao
        titulo={ptam ? "Saneamento e homogeneização" : "Ajustes das referências"}
        descricao="Para cada comparável da amostra, lance os fatores de ajuste que aproximam a referência do imóvel avaliando. Todo fator é informado por uma pessoa e precisa de justificativa; o sistema não sugere percentuais."
      >
        {calc.amostra.length === 0 ? (
          <Aviso tom="bloqueio">Não há comparáveis válidos (com preço e área) nesta finalidade. Sem amostra não há sustentação para conclusão numérica.</Aviso>
        ) : (
          <ul className="space-y-3">
            {calc.amostra.map((linha) => (
              <li key={linha.id} className="rounded-xl border border-border/70 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{linha.identificacao}</p>
                    <p className="num mt-0.5 text-xs text-ink-muted">
                      {moeda(linha.preco, fin)} ÷ {linha.areaM2.toLocaleString("pt-BR")} m² = {moedaM2(linha.m2Bruto, fin)} (bruto)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-bold text-brand">{moedaM2(linha.m2Ajustado, fin)}</p>
                    <p className="num text-xs text-ink-muted">fator total {linha.fator.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                  </div>
                </div>

                {linha.ajustes.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {linha.ajustes.map((aj, i) => (
                      <li key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-background px-3 py-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">
                            {aj.fator}: {aj.percentual > 0 ? "+" : ""}
                            {aj.percentual.toLocaleString("pt-BR")}%
                          </p>
                          <p className="mt-0.5 text-ink-muted">{aj.justificativa}</p>
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            {aj.origem ? `Origem: ${aj.origem} · ` : ""}
                            lançado por {aj.autor_nome ?? "—"} em {dataBR(aj.em)}
                          </p>
                        </div>
                        <form action={removerAjuste}>
                          <input type="hidden" name="avaliacao_id" value={a.id} />
                          <input type="hidden" name="comparavel_id" value={linha.id} />
                          <input type="hidden" name="indice" value={i} />
                          <button type="submit" className="text-rose-700 hover:underline">
                            Remover
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                <details className="mt-3 rounded-lg border border-border/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Lançar fator de ajuste</summary>
                  <form action={adicionarAjuste} className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                    <input type="hidden" name="avaliacao_id" value={a.id} />
                    <input type="hidden" name="comparavel_id" value={linha.id} />
                    <label className="block">
                      <span className={ROTULO_CLASS}>Fator</span>
                      <select name="fator" className={INPUT_CLASS} defaultValue={FATORES_AJUSTE[0]}>
                        {FATORES_AJUSTE.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={ROTULO_CLASS}>Percentual (%)</span>
                      <input name="percentual" required inputMode="decimal" placeholder="-5 ou 3,5" className={INPUT_CLASS} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={ROTULO_CLASS}>Justificativa *</span>
                      <textarea name="justificativa" required rows={2} placeholder="Por que este ajuste? Positivo valoriza a referência; negativo desvaloriza." className={INPUT_CLASS} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={ROTULO_CLASS}>Origem do percentual (opcional)</span>
                      <input name="origem" placeholder="Critério da avaliadora, vistoria, histórico de negociações…" className={INPUT_CLASS} />
                    </label>
                    <div className="sm:col-span-2">
                      <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Lançando…">
                        Lançar ajuste
                      </BotaoEnviar>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo={ptam ? "Tratamento dos dados" : "Resultado da pesquisa"} descricao="Medidas descritivas da amostra final. Não há intervalo de confiança, regressão nem tendência: só o que a amostra mostra.">
        {e ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Numero rotulo="Amostra final" valor={`${e.n} de ${calc.amostraInicial}`} nota={`${calc.ofertas} oferta(s) · ${calc.transacoes} transação(ões) · ${calc.excluidos} excluído(s)`} />
              <Numero rotulo="Mediana (R$/m² ajustado)" valor={moedaM2(e.mediana, fin)} />
              <Numero rotulo="Intervalo observado" valor={`${moedaM2(e.minimo, fin).replace(/\/m².*/, "")} a ${moedaM2(e.maximo, fin)}`} />
              <Numero
                rotulo="Média e dispersão"
                valor={moedaM2(e.media, fin)}
                nota={e.coeficienteVariacaoPct !== null ? `dispersão (desvio padrão ÷ média): ${e.coeficienteVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "dispersão: precisa de 2 ou mais comparáveis"}
              />
            </div>
            {a.area_m2 && calc.valorCalculado !== null && <MemoriaCalculo dados={{
              titulo: a.titulo, finalidade: fin, areaImovel: a.area_m2, medianaM2: e.mediana, valorSugerido: calc.valorCalculado,
              comparaveis: calc.amostra.map((linha) => ({ endereco: linha.identificacao, area: linha.areaM2, fonte: c.comparaveis.find((x) => x.id === linha.id)?.fonte_nome ?? "Fonte registrada na pesquisa", valorPesquisado: linha.preco, ajustePercentual: (linha.fator - 1) * 100, valorM2: linha.m2Ajustado })),
            }} />}
            <div className="mt-4 rounded-lg bg-background px-4 py-3 text-xs leading-6 text-ink-muted">
              <p className="font-semibold text-ink">Fórmulas e arredondamento</p>
              <p>R$/m² bruto = preço ÷ área do comparável{fin === "locacao" ? " (aluguel mensal)" : ""}.</p>
              <p>R$/m² ajustado = R$/m² bruto × produto dos fatores (1 + percentual ÷ 100).</p>
              <p>
                Valor calculado = mediana × área do imóvel ={" "}
                <strong className="num text-ink">
                  {moedaM2(e.mediana, fin)} × {a.area_m2 ? `${a.area_m2.toLocaleString("pt-BR")} m²` : "área não informada"} = {moeda(calc.valorCalculado, fin)}
                </strong>
                .
              </p>
              <p>
                Faixa calculada = menor e maior R$/m² ajustado × área ={" "}
                <strong className="num text-ink">
                  {moeda(calc.faixaCalculadaMin, fin)} a {moeda(calc.faixaCalculadaMax, fin)}
                </strong>
                .
              </p>
              <p>Valores totais arredondados para múltiplos de R$ {passoArredondamento(fin).toLocaleString("pt-BR")}.</p>
            </div>
            {e.n < c.config.limiares.amostraMinima && (
              <div className="mt-3">
                <Aviso tom="alerta">
                  Amostra com {e.n} comparável(is), abaixo de {c.config.limiares.amostraMinima}. É possível prosseguir, desde que a justificativa esteja registrada na etapa Comparáveis; o PDF mostra a limitação.
                </Aviso>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Sem amostra válida.</p>
        )}
      </Cartao>

      <Cartao
        titulo="Faixa e valor"
        descricao="A faixa indicativa, o valor calculado, o valor sugerido e o valor pretendido pelo proprietário são campos separados. Toda edição manual pede justificativa e fica no histórico, com o valor anterior, o novo, quem alterou e quando."
      >
        <FormPreco
          key={`${a.revisao}`}
          avaliacaoId={a.id}
          finalidade={fin}
          areaM2={a.area_m2}
          rotuloValor={rotuloValor}
          valorCalculado={calc.valorCalculado}
          faixaCalculadaMin={calc.faixaCalculadaMin}
          faixaCalculadaMax={calc.faixaCalculadaMax}
          inicial={{
            valorSugerido: a.valor_sugerido,
            justificativaValor: a.dados.justificativa_valor ?? "",
            faixaManual: a.faixa_manual,
            faixaMin: a.faixa_min,
            faixaMax: a.faixa_max,
            justificativaFaixa: a.dados.justificativa_faixa ?? "",
            margem: a.margem_negociacao_pct,
            valorProprietario: a.valor_proprietario,
            fundamentacao: a.dados.fundamentacao ?? "",
          }}
        />
      </Cartao>
    </div>
  );
}
