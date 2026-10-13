import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Ban, CheckCircle2, ChevronDown, FileText, Info, Plus, Ruler } from "lucide-react";
import { Casca } from "../casca";
import { calcular, type Linha, type Resultado } from "../calculo";
import { FATORES, FATOR_OFERTA, IMOVEL_AVALIADO, REFERENCIAS, type Referencia } from "../dados";
import { Botao, Campo, cx, Dialogo, moeda, numero, Segmentado, Selecao, Selo, TituloPainel, useAviso, Vazio } from "../ui";

type Passo = 1 | 2 | 3;
const PASSOS: { n: Passo; rotulo: string }[] = [{ n: 1, rotulo: "Imóvel e cliente" }, { n: 2, rotulo: "Referências" }, { n: 3, rotulo: "Preço e estudo" }];
const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export function TelaAvaliacao() {
  const avisar = useAviso();
  const [passo, setPasso] = useState<Passo>(2);
  const [imovel, setImovel] = useState({ ...IMOVEL_AVALIADO, area: String(IMOVEL_AVALIADO.area).replace(".", ",") });
  const [refs, setRefs] = useState<Referencia[]>(REFERENCIAS);
  const [aberta, setAberta] = useState<string | null>("r2");
  const [nova, setNova] = useState(false);
  const area = Number(imovel.area.replace(",", ".")) || 0;
  const res = useMemo(() => calcular(refs, { endereco: imovel.endereco, area: area || 1 }), [refs, imovel.endereco, area]);
  const [preco, setPreco] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [tentouEmitir, setTentouEmitir] = useState(false);
  const [emitido, setEmitido] = useState(false);

  const erros1 = { endereco: !imovel.endereco.trim() ? "Informe o endereço do imóvel avaliado." : undefined, area: !area ? "Informe a área privativa em m²." : undefined, cliente: !imovel.cliente.trim() ? "Informe o nome do cliente." : undefined };
  const passo1ok = !erros1.endereco && !erros1.area && !erros1.cliente;
  const precoNum = Number(preco.replace(/\D/g, "")) || res.referencia || 0;
  const desvio = res.referencia ? (precoNum - res.referencia) / res.referencia : 0;
  const precisaMotivo = Math.abs(desvio) > 0.05;
  const pendencias = [
    !passo1ok && "Complete os dados do imóvel e do cliente.",
    res.n < 3 && `Use pelo menos 3 referências válidas (hoje: ${res.n}).`,
    precisaMotivo && !motivo.trim() && "Explique por que o preço recomendado difere mais de 5% da referência calculada.",
  ].filter(Boolean) as string[];

  const mudarAjuste = (id: string, chave: string, v: -1 | 0 | 1) => setRefs((l) => l.map((r) => (r.id === id ? { ...r, ajustes: { ...r.ajustes, [chave]: v } } : r)));
  const alternarUso = (l: Linha) => {
    if (l.bloqueio) { avisar({ tipo: "erro", texto: l.bloqueio }); return; }
    setRefs((x) => x.map((r) => (r.id === l.id ? { ...r, usar: !r.usar } : r)));
  };

  return (
    <Casca perfil="gestao" ativo="avaliacoes" usuario="Helena Duarte Vasconcelos" titulo="Estudo de mercado">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-chumbo-3">Estudo de mercado · rascunho</p>
          <h1 className="text-[24px] font-bold leading-tight @3xl:text-[30px]">{imovel.endereco || "Novo estudo"}{imovel.bairro && <span className="font-medium text-chumbo-2"> · {imovel.bairro}</span>}</h1>
        </header>

        {/* passos */}
        <ol className="caixilho caixilho-forte mt-4 grid-cols-3" aria-label="Passos do estudo">
          {PASSOS.map((p) => {
            const atual = p.n === passo;
            const feito = p.n < passo || (p.n === 1 && passo1ok && passo !== 1) || (p.n === 2 && res.n >= 3 && passo === 3);
            return (
              <li key={p.n}>
                <button type="button" onClick={() => setPasso(p.n)} aria-current={atual ? "step" : undefined} className={cx("flex h-full min-h-14 w-full items-center gap-2.5 px-3 text-left @3xl:px-4", atual ? "bg-chumbo text-vidro" : "hover:bg-vidro-2")}>
                  <span className={cx("num flex size-7 shrink-0 items-center justify-center text-[13px] font-bold", atual ? "bg-ouro-luz text-[#221e1d]" : feito ? "bg-ok-vidro text-ok" : "bg-vidro-2 text-chumbo-3 ring-1 ring-inset ring-filete")}>{feito && !atual ? <CheckCircle2 size={15} aria-hidden /> : p.n}</span>
                  <span className={cx("hidden text-sm font-medium leading-tight @lg:block", !atual && "text-chumbo-2")}>{p.rotulo}</span>
                  <span className="sr-only @lg:hidden">{p.rotulo}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm font-medium @lg:hidden">Passo {passo} de 3 · {PASSOS[passo - 1].rotulo}</p>

        {passo === 1 && (
          <section className="mt-5 border border-chumbo bg-vidro">
            <TituloPainel descricao="Só o essencial para comparar. Fotos e documentos podem vir depois.">Imóvel e cliente</TituloPainel>
            <div className="grid gap-x-5 gap-y-4 border-t border-filete px-4 py-4 @3xl:grid-cols-2 @3xl:px-5 @5xl:grid-cols-4">
              <Campo className="@5xl:col-span-2" rotulo="Cliente" value={imovel.cliente} onChange={(e) => setImovel({ ...imovel, cliente: e.target.value })} erro={erros1.cliente} />
              <div className="@5xl:col-span-2"><Segmentado rotulo="Finalidade" valor={imovel.finalidade} onChange={(v) => setImovel({ ...imovel, finalidade: v as "venda" })} opcoes={[{ valor: "venda", rotulo: "Venda" }, { valor: "locacao" as "venda", rotulo: "Locação" }]} /></div>
              <Campo className="@5xl:col-span-2" rotulo="Endereço" value={imovel.endereco} onChange={(e) => setImovel({ ...imovel, endereco: e.target.value })} erro={erros1.endereco} ajuda="Como no endereçamento de Brasília: quadra, bloco e unidade." />
              <Campo rotulo="Bairro ou região" value={imovel.bairro} onChange={(e) => setImovel({ ...imovel, bairro: e.target.value })} />
              <Selecao rotulo="Tipo" value={imovel.tipo} onChange={(e) => setImovel({ ...imovel, tipo: e.target.value })} opcoes={["Apartamento", "Casa", "Sala comercial", "Loja", "Lote"].map((t) => ({ valor: t, rotulo: t }))} />
              <Campo rotulo="Área privativa" inputMode="decimal" sufixo="m²" value={imovel.area} onChange={(e) => setImovel({ ...imovel, area: e.target.value })} erro={erros1.area} />
              <Campo rotulo="Quartos" inputMode="numeric" value={String(imovel.quartos)} onChange={(e) => setImovel({ ...imovel, quartos: Number(e.target.value) || 0 })} />
              <Campo rotulo="Vagas" inputMode="numeric" value={String(imovel.vagas)} onChange={(e) => setImovel({ ...imovel, vagas: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end border-t border-filete bg-vidro-2 px-4 py-3 @3xl:px-5"><Botao variante="principal" icone={ArrowRight} onClick={() => setPasso(2)}>Ir para referências</Botao></div>
          </section>
        )}

        {passo === 2 && (
          <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 border border-chumbo bg-vidro">
              <TituloPainel descricao={<>Anúncios recebem o fator de oferta ({numero(FATOR_OFERTA, 2)}) automaticamente. Ajuste cada referência em relação ao imóvel avaliado.</>} acao={<Botao tamanho="p" icone={Plus} onClick={() => setNova(true)}>Adicionar</Botao>}>Referências</TituloPainel>
              {res.linhas.length === 0 ? (
                <Vazio icone={Ruler} titulo="Nenhuma referência ainda" texto="Adicione imóveis parecidos anunciados ou vendidos na região. São necessárias ao menos 3 para calcular." acao={<Botao tamanho="p" icone={Plus} onClick={() => setNova(true)}>Adicionar referência</Botao>} />
              ) : (
                <ul className="divide-y divide-filete border-t border-filete">
                  {res.linhas.map((l) => <LinhaReferencia key={l.id} l={l} aberta={aberta === l.id} abrir={() => setAberta(aberta === l.id ? null : l.id)} alternar={() => alternarUso(l)} ajustar={(c, v) => mudarAjuste(l.id, c, v)} />)}
                </ul>
              )}
            </section>
            <aside className="min-w-0 @5xl:sticky @5xl:top-4 @5xl:self-start">
              <PainelResultado res={res} area={area} />
              <div className="mt-3 flex justify-between gap-2">
                <Botao icone={ArrowLeft} onClick={() => setPasso(1)}>Voltar</Botao>
                <Botao variante="principal" icone={ArrowRight} onClick={() => setPasso(3)}>Definir preço</Botao>
              </div>
            </aside>
          </div>
        )}

        {passo === 3 && (
          <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 border border-chumbo bg-vidro">
              <TituloPainel descricao="O cálculo sugere; a decisão é da equipe. O cliente vê um único preço recomendado.">Preço recomendado</TituloPainel>
              <div className="border-t border-filete px-4 py-4 @3xl:px-5">
                {res.referencia == null ? (
                  <div className="flex gap-3 border border-atencao/60 bg-atencao-vidro px-4 py-3 text-sm"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-atencao" aria-hidden /><div><p className="font-semibold text-atencao">Sem referência calculada</p><p className="mt-0.5">Com menos de 3 referências válidas o sistema não sugere preço. Volte ao passo 2 ou informe o preço manualmente com justificativa.</p><Botao className="mt-2" tamanho="p" icone={ArrowLeft} onClick={() => setPasso(2)}>Voltar às referências</Botao></div></div>
                ) : (
                  <div className="grid gap-5 @3xl:grid-cols-2">
                    <div>
                      <Campo rotulo="Preço recomendado ao cliente" prefixo="R$" inputMode="numeric" value={preco || numero(res.referencia)} onChange={(e) => setPreco(numero(Number(e.target.value.replace(/\D/g, "")) || 0))} ajuda={`Referência calculada: ${moeda(res.referencia)}`} />
                      <p className={cx("mt-2 text-sm", precisaMotivo ? "font-medium text-atencao" : "text-chumbo-2")}>
                        {desvio === 0 ? "Igual à referência calculada." : `${desvio > 0 ? "+" : "−"}${numero(Math.abs(desvio) * 100, 1)}% em relação à referência.`}
                        {precisaMotivo && " Acima de 5%: explique o motivo."}
                      </p>
                      {preco && <button type="button" className="mt-1 text-sm font-medium text-bordo underline-offset-4 hover:underline" onClick={() => { setPreco(""); setMotivo(""); }}>Voltar para a referência calculada</button>}
                    </div>
                    <div className="caixilho text-sm">
                      <div className="px-3 py-2.5"><p className="text-[12.5px] text-chumbo-3">Faixa de negociação</p><p className="num mt-0.5 font-medium">{res.faixa ? `${moeda(res.faixa[0])} a ${moeda(res.faixa[1])}` : "—"}</p></div>
                      <div className="px-3 py-2.5"><p className="text-[12.5px] text-chumbo-3">Preço por m²</p><p className="num mt-0.5 font-medium">{area ? moeda(precoNum / area) : "—"}/m²</p></div>
                    </div>
                    {precisaMotivo && (
                      <div className="anim-surgir @3xl:col-span-2">
                        <label htmlFor="motivo" className="mb-1.5 block text-sm font-medium">Motivo da diferença</label>
                        <textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: vista livre e reforma completa em 2025, não refletidas nas referências." className={cx("w-full border bg-vidro px-3 py-2 text-base outline-none focus:border-foco focus:ring-1 focus:ring-foco @lg:text-[15px]", tentouEmitir && !motivo.trim() ? "border-critico" : "border-chumbo/45")} />
                        <p className="mt-1 text-[13px] text-chumbo-3">Fica no histórico do estudo; não aparece para o cliente.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <details className="group border-t border-filete">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium @3xl:px-5"><ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden />Outros métodos (opcional)</summary>
                <div className="grid gap-px border-t border-filete bg-filete text-sm @3xl:grid-cols-3">
                  {[["Evolutivo", "Terreno + construção depreciada. Útil para casas e imóveis sem comparáveis."], ["Renda", "Aluguel anual ÷ taxa de capitalização. Útil para salas e lojas alugadas."], ["Involutivo", "Para lotes com potencial de construção."]].map(([t, d]) => (
                    <div key={t} className="bg-vidro px-4 py-3"><p className="font-medium">{t}</p><p className="mt-0.5 text-[13px] text-chumbo-2">{d}</p><button type="button" className="mt-2 text-[13px] font-medium text-bordo underline-offset-4 hover:underline" onClick={() => avisar({ tipo: "info", texto: `${t}: abre o apoio de cálculo (não incluído no laboratório).` })}>Usar como apoio</button></div>
                  ))}
                </div>
              </details>
            </section>
            <aside className="min-w-0 space-y-3">
              <section className="border border-chumbo bg-vidro">
                <TituloPainel>Antes de gerar</TituloPainel>
                {pendencias.length === 0 ? (
                  <p className="flex items-center gap-2 border-t border-filete px-4 py-3 text-sm text-ok @3xl:px-5"><CheckCircle2 size={16} aria-hidden />Tudo pronto para gerar o estudo.</p>
                ) : (
                  <ul className={cx("space-y-2 border-t border-filete px-4 py-3 text-sm @3xl:px-5", tentouEmitir && "bg-critico-vidro")}>
                    {pendencias.map((p) => <li key={p} className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-atencao" aria-hidden />{p}</li>)}
                  </ul>
                )}
              </section>
              {emitido ? (
                <div className="anim-surgir border border-ok/60 bg-ok-vidro px-4 py-3 text-sm"><p className="font-semibold text-ok">Estudo gerado</p><p className="mt-0.5">Versão 1 guardada. Alterações a partir de agora criam uma nova versão.</p><a href="#telas-relatorio" className="mt-2 inline-flex items-center gap-1.5 font-medium text-bordo underline-offset-4 hover:underline"><FileText size={15} aria-hidden />Ver o relatório do cliente</a></div>
              ) : (
                <Botao variante="principal" className="w-full" icone={FileText} onClick={() => { setTentouEmitir(true); if (pendencias.length) avisar({ tipo: "erro", texto: pendencias.length === 1 ? "Falta 1 item antes de gerar." : `Faltam ${pendencias.length} itens antes de gerar.` }); else { setEmitido(true); avisar({ tipo: "ok", texto: "Estudo gerado (simulação)." }); } }}>Gerar estudo para o cliente</Botao>
              )}
              <Botao className="w-full" icone={ArrowLeft} onClick={() => setPasso(2)}>Voltar às referências</Botao>
            </aside>
          </div>
        )}
      </div>

      <NovaReferencia aberto={nova} fechar={() => setNova(false)} salvar={(r) => { setRefs((l) => [...l, r]); setNova(false); setAberta(r.id); avisar({ tipo: "ok", texto: "Referência adicionada." }); }} />
    </Casca>
  );
}

function PainelResultado({ res, area }: { res: Resultado; area: number }) {
  return (
    <section className="border border-chumbo bg-vidro" aria-live="polite">
      <div className="px-4 pt-4 @3xl:px-5">
        <p className="text-sm text-chumbo-2">Referência calculada</p>
        {res.referencia == null ? (
          <>
            <p className="mt-1 font-titulo text-[24px] font-bold leading-tight text-chumbo-3">Ainda sem valor</p>
            <p className="mt-2 flex items-start gap-1.5 pb-4 text-sm text-atencao"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />{res.n === 0 ? "Marque referências para usar no cálculo." : (3 - res.n === 1 ? "Falta 1 referência válida" : `Faltam ${3 - res.n} referências válidas`) + " (mínimo de 3)."}</p>
          </>
        ) : (
          <>
            <p key={res.referencia} className="num anim-acender mt-1 font-titulo text-[34px] font-bold leading-none">{moeda(res.referencia)}</p>
            <p className="mt-2 text-[13px] text-chumbo-2">Mediana de <span className="num">{moeda(res.mediana!)}</span>/m² × {numero(area, 2)} m²</p>
          </>
        )}
      </div>
      {res.referencia != null && (
        <dl className="mt-4 divide-y divide-filete border-t border-filete text-sm">
          <div className="flex justify-between gap-3 px-4 py-2.5 @3xl:px-5"><dt className="text-chumbo-2">Faixa ({res.faixaTipo === "quartis" ? "quartis" : "menor e maior"})</dt><dd className="num text-right font-medium">{moeda(res.faixa![0])} – {moeda(res.faixa![1])}</dd></div>
          <div className="flex justify-between gap-3 px-4 py-2.5 @3xl:px-5"><dt className="text-chumbo-2">Referências usadas</dt><dd className="num font-medium">{res.n} <span className="font-normal text-chumbo-3">({res.negocios} {res.negocios === 1 ? "negócio" : "negócios"})</span></dd></div>
          <div className="flex justify-between gap-3 px-4 py-2.5 @3xl:px-5"><dt className="text-chumbo-2">Dispersão</dt><dd>{res.estado === "disperso" ? <Selo situacao="atencao">Alta · {numero(res.cv! * 100, 0)}%</Selo> : <Selo situacao="ok">Boa · {numero(res.cv! * 100, 0)}%</Selo>}</dd></div>
        </dl>
      )}
      {res.estado === "disperso" && <p className="border-t border-filete px-4 py-3 text-[13px] text-chumbo-2 @3xl:px-5">Os preços por m² variam muito. Revise referências muito diferentes do imóvel antes de definir o preço.</p>}
    </section>
  );
}

function LinhaReferencia({ l, aberta, abrir, alternar, ajustar }: { l: Linha; aberta: boolean; abrir: () => void; alternar: () => void; ajustar: (chave: string, v: -1 | 0 | 1) => void }) {
  const usada = l.usar && !l.bloqueio;
  return (
    <li className={cx(!usada && "bg-vidro-2")}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 py-3 @3xl:grid-cols-[auto_minmax(0,1fr)_110px_120px_32px] @3xl:items-center @3xl:px-5">
        <button type="button" role="switch" aria-checked={usada} aria-label={`Usar ${l.endereco} no cálculo`} onClick={alternar}
          className={cx("mt-0.5 flex h-6 w-10 shrink-0 items-center border p-0.5 transition-colors @3xl:mt-0", l.bloqueio ? "cursor-not-allowed border-critico/50 bg-critico-vidro" : usada ? "border-chumbo bg-chumbo" : "border-chumbo/45 bg-vidro")}>
          {l.bloqueio ? <Ban size={14} className="mx-auto text-critico" aria-hidden /> : <span className={cx("block size-4 transition-transform duration-[var(--movimento-medio)]", usada ? "translate-x-4 bg-ouro-luz" : "bg-chumbo/45")} />}
        </button>
        <div className="min-w-0">
          <p className={cx("font-medium leading-snug", !usada && "text-chumbo-2")}>{l.endereco}</p>
          <p className="num text-[13px] text-chumbo-3">{numero(l.area, l.area % 1 ? 2 : 0)} m² · {moeda(l.preco)} · {l.tipoPreco === "anuncio" ? "anúncio" : "negócio fechado"} · {dataBr(l.data)}</p>
          {(l.bloqueio || l.alertas.length > 0 || l.observacao) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {l.bloqueio && <Selo situacao="atrasado">Próprio imóvel</Selo>}
              {l.alertas.map((a) => <Selo key={a} situacao="atencao">{a}</Selo>)}
              {l.observacao && !l.bloqueio && <span className="inline-flex h-6 items-center text-[12.5px] text-chumbo-2">{l.observacao}</span>}
            </div>
          )}
        </div>
        <div className="col-start-2 mt-2 flex items-baseline gap-2 @3xl:col-start-auto @3xl:mt-0 @3xl:block @3xl:text-right">
          <p className="num text-[13px] text-chumbo-3">{moeda(l.m2)}/m²</p>
          <p className="num text-[12.5px] text-chumbo-3">× {numero(l.fator, 3)}</p>
        </div>
        <p className={cx("num col-start-2 text-[15px] font-semibold @3xl:col-start-auto @3xl:text-right", !usada && "text-chumbo-3 line-through decoration-1")}>{moeda(l.m2Ajustado)}<span className="text-[12px] font-normal text-chumbo-3">/m²</span></p>
        <button type="button" aria-expanded={aberta} aria-label={`Ajustes de ${l.endereco}`} onClick={abrir} className="col-start-2 mt-1 flex h-9 w-fit items-center gap-1 text-[13px] font-medium text-chumbo-2 hover:text-chumbo @3xl:col-start-auto @3xl:mt-0 @3xl:w-8 @3xl:justify-center">
          <ChevronDown size={18} className={cx("transition-transform", aberta && "rotate-180")} aria-hidden /><span className="@3xl:sr-only">Ajustes</span>
        </button>
      </div>
      {aberta && (
        <div className="anim-surgir border-t border-dashed border-filete bg-vidro-2 px-4 py-3 @3xl:pl-[76px] @3xl:pr-5">
          <p className="mb-2 flex items-start gap-1.5 text-[13px] text-chumbo-2"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />Compare esta referência com o imóvel avaliado. “Melhor” reduz o preço por m²; “pior” aumenta.</p>
          <div className="grid gap-3 @3xl:grid-cols-2">
            {FATORES.map((f) => (
              <div key={f.chave}>
                <Segmentado rotulo={`${f.rotulo} (±${f.pct}%)`} valor={String(l.ajustes[f.chave] ?? 0) as "-1" | "0" | "1"} onChange={(v) => ajustar(f.chave, Number(v) as -1 | 0 | 1)}
                  opcoes={[{ valor: "-1", rotulo: "Pior" }, { valor: "0", rotulo: "Igual" }, { valor: "1", rotulo: "Melhor" }]} />
              </div>
            ))}
          </div>
          {l.tipoPreco === "anuncio" && <p className="mt-2 text-[12.5px] text-chumbo-3">Fator de oferta {numero(FATOR_OFERTA, 2)} já aplicado (anúncio costuma fechar abaixo do pedido).</p>}
        </div>
      )}
    </li>
  );
}

function NovaReferencia({ aberto, fechar, salvar }: { aberto: boolean; fechar: () => void; salvar: (r: Referencia) => void }) {
  const [f, setF] = useState({ endereco: "", area: "", preco: "", tipo: "anuncio" as "anuncio" | "negocio" });
  const [tentou, setTentou] = useState(false);
  const area = Number(f.area.replace(",", "."));
  const preco = Number(f.preco.replace(/\D/g, ""));
  const erros = { endereco: !f.endereco.trim() ? "Informe o endereço." : undefined, area: !area ? "Informe a área em m²." : undefined, preco: !preco ? "Informe o preço." : undefined };
  const enviar = () => {
    setTentou(true);
    if (erros.endereco || erros.area || erros.preco) return;
    salvar({ id: `n${Date.now()}`, endereco: f.endereco, area, preco, tipoPreco: f.tipo, data: "2026-10-13", origem: "Inserida agora", ajustes: { conservacao: 0, andar: 0, vagas: 0, localizacao: 0 }, usar: true });
    setF({ endereco: "", area: "", preco: "", tipo: "anuncio" }); setTentou(false);
  };
  return (
    <Dialogo aberto={aberto} fechar={fechar} titulo="Adicionar referência" acoes={<><Botao onClick={fechar}>Cancelar</Botao><Botao variante="principal" icone={Plus} onClick={enviar}>Adicionar</Botao></>}>
      <div className="space-y-4">
        <Campo rotulo="Endereço" placeholder="Ex.: QI 10 Bloco H apto 302" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} erro={tentou ? erros.endereco : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Área" sufixo="m²" inputMode="decimal" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} erro={tentou ? erros.area : undefined} />
          <Campo rotulo="Preço" prefixo="R$" inputMode="numeric" value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} erro={tentou ? erros.preco : undefined} />
        </div>
        <Segmentado rotulo="Origem do preço" valor={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} opcoes={[{ valor: "anuncio", rotulo: "Anúncio" }, { valor: "negocio", rotulo: "Negócio fechado" }]} />
      </div>
    </Dialogo>
  );
}
