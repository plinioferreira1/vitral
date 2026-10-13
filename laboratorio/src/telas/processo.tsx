import { useState } from "react";
import { CheckCircle2, ChevronLeft, Circle, CircleDot, FileText, MoreHorizontal, Pencil, Upload, XCircle, Copy, Trash2, MessageSquarePlus } from "lucide-react";
import { Casca } from "../casca";
import { PROCESSO_VENDA, type Etapa } from "../dados";
import { Abas, Avatar, Botao, Campo, cx, Dialogo, Menu, moeda, Selo, TituloPainel, useAviso, VidroArea } from "../ui";

const dataBr = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

function MarcaEtapa({ s }: { s: Etapa["situacao"] }) {
  if (s === "feita") return <CheckCircle2 size={20} className="text-ok" aria-hidden />;
  if (s === "atrasada") return <XCircle size={20} className="text-critico" aria-hidden />;
  if (s === "atual") return <CircleDot size={20} className="text-atencao" aria-hidden />;
  return <Circle size={20} className="text-chumbo-3" aria-hidden />;
}
const ROTULO: Record<Etapa["situacao"], string> = { feita: "Concluída", atrasada: "Atrasada", atual: "Em andamento", futura: "Prevista" };

export function TelaProcesso() {
  const avisar = useAviso();
  const p = PROCESSO_VENDA;
  const [etapas, setEtapas] = useState<Etapa[]>(p.etapas);
  const [aba, setAba] = useState<"etapas" | "documentos" | "historico">("etapas");
  const [concluindo, setConcluindo] = useState<Etapa | null>(null);
  const [data, setData] = useState("2026-10-13");
  const [erro, setErro] = useState<string>();
  const [historico, setHistorico] = useState(p.historico);
  const [nota, setNota] = useState("");

  const feitas = etapas.filter((e) => e.situacao === "feita").length;
  const atrasada = etapas.find((e) => e.situacao === "atrasada");
  const proxima = etapas.find((e) => e.situacao !== "feita");

  const confirmar = () => {
    if (!data) { setErro("Informe a data em que a etapa foi concluída."); return; }
    if (data > "2026-10-13") { setErro("A data não pode ser depois de hoje (13/10/2026)."); return; }
    const alvo = concluindo!;
    const antes = etapas;
    setEtapas((l) => {
      const novo = l.map((e) => (e.nome === alvo.nome ? { ...e, situacao: "feita" as const, realizada: data } : e));
      const i = novo.findIndex((e) => e.situacao === "futura");
      if (i >= 0) novo[i] = { ...novo[i], situacao: "atual" };
      return novo;
    });
    setConcluindo(null);
    avisar({ tipo: "ok", texto: `“${alvo.nome}” concluída em ${dataBr(data)}.`, desfazer: () => setEtapas(antes) });
  };

  return (
    <Casca perfil="gestao" ativo="processos" usuario="Helena Duarte Vasconcelos" titulo="Venda 2026/031">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <a href="#telas-processo" className="mb-3 inline-flex items-center gap-1 text-sm text-chumbo-2 hover:text-chumbo"><ChevronLeft size={16} aria-hidden />Processos</a>
        <header className="flex flex-col gap-4 @4xl:flex-row @4xl:items-start @4xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><VidroArea area="venda" /><span className="num text-sm text-chumbo-3">{p.codigo}</span>{atrasada && <Selo situacao="atrasado">1 etapa atrasada</Selo>}</div>
            <h1 className="mt-1.5 text-[24px] font-bold leading-tight @3xl:text-[30px]">{p.imovel}</h1>
            <p className="mt-1 text-chumbo-2">{p.bairro} · <span className="num font-medium text-chumbo">{moeda(p.valor)}</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {proxima && <Botao variante="principal" icone={CheckCircle2} onClick={() => { setData("2026-10-13"); setErro(undefined); setConcluindo(proxima); }}>Concluir “{proxima.nome.length > 22 ? proxima.nome.slice(0, 20) + "…" : proxima.nome}”</Botao>}
            <Menu rotulo="Mais ações" gatilho={<MoreHorizontal size={18} />} itens={[
              { rotulo: "Editar dados da venda", icone: Pencil, acao: () => avisar({ tipo: "info", texto: "No laboratório, a edição não abre um formulário." }) },
              { rotulo: "Duplicar como novo processo", icone: Copy, acao: () => avisar({ tipo: "info", texto: "Cópia criada como rascunho (simulação)." }) },
              { rotulo: "Excluir processo", icone: Trash2, perigo: true, acao: () => avisar({ tipo: "erro", texto: "Exclusão bloqueada: o processo tem comissão cadastrada." }) },
            ]} />
          </div>
        </header>

        {/* partes */}
        <dl className="caixilho caixilho-forte mt-5 grid-cols-1 text-sm @2xl:grid-cols-2 @5xl:grid-cols-[1.4fr_1.4fr_1fr_1fr]">
          <div className="px-4 py-3"><dt className="text-[12.5px] text-chumbo-3">Comprador</dt><dd className="mt-0.5 font-medium">{p.comprador}</dd></div>
          <div className="px-4 py-3"><dt className="text-[12.5px] text-chumbo-3">Vendedor</dt><dd className="mt-0.5 font-medium">{p.vendedor}</dd></div>
          <div className="px-4 py-3"><dt className="text-[12.5px] text-chumbo-3">Corretora e captador</dt><dd className="mt-0.5"><span className="font-medium">{p.corretor}</span><br /><span className="text-chumbo-2">capt. {p.captador}</span></dd></div>
          <div className="px-4 py-3"><dt className="text-[12.5px] text-chumbo-3">Entrega prevista</dt><dd className="num mt-0.5 font-medium">{dataBr(p.prazoFinal)}/2026</dd><dd className="text-chumbo-2">{feitas} de {etapas.length} etapas</dd></div>
        </dl>

        {/* linha do tempo horizontal (computador) */}
        <section aria-label="Etapas" className="mt-5 hidden border border-chumbo bg-vidro @4xl:block">
          <ol className="grid" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0,1fr))` }}>
            {etapas.map((e, i) => (
              <li key={e.nome} className={cx("relative border-l border-filete px-3 pb-4 pt-3 first:border-l-0", e.situacao === "atrasada" && "bg-critico-vidro", e.situacao === "atual" && "bg-atencao-vidro")}>
                <span aria-hidden className={cx("absolute inset-x-0 top-0 h-1", e.situacao === "feita" ? "bg-ok" : e.situacao === "atrasada" ? "bg-critico" : e.situacao === "atual" ? "bg-atencao" : "bg-filete")} />
                <div className="mt-1 flex items-center gap-1.5"><MarcaEtapa s={e.situacao} /><span className="num text-[12px] text-chumbo-3">{i + 1}</span></div>
                <p className="mt-1.5 text-[13.5px] font-semibold leading-snug">{e.nome}</p>
                <p className="num mt-1 text-[12.5px] text-chumbo-2">{e.realizada ? `feita ${dataBr(e.realizada)}` : `prev. ${dataBr(e.prevista)}`}</p>
                <span className="sr-only">{ROTULO[e.situacao]}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 border border-chumbo bg-vidro">
            <div className="px-4 @3xl:px-5">
              <Abas rotulo="Seções do processo" ativa={aba} onChange={setAba} abas={[{ valor: "etapas", rotulo: "Etapas", contagem: etapas.length }, { valor: "documentos", rotulo: "Documentos", contagem: p.documentos.length }, { valor: "historico", rotulo: "Histórico", contagem: historico.length }]} />
            </div>
            {aba === "etapas" && (
              <ol className="divide-y divide-filete">
                {etapas.map((e) => (
                  <li key={e.nome} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 px-4 py-3 @3xl:grid-cols-[24px_minmax(0,1fr)_170px_auto] @3xl:items-center @3xl:px-5">
                    <MarcaEtapa s={e.situacao} />
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{e.nome}</p>
                      <p className="num text-[13px] text-chumbo-2">
                        {e.realizada ? `Concluída em ${dataBr(e.realizada)}` : `Prevista para ${dataBr(e.prevista)}`}
                        {e.situacao === "atrasada" && <span className="font-semibold text-critico"> · 3 dias de atraso</span>}
                      </p>
                      {e.nota && <p className="mt-0.5 text-[13px] text-chumbo-3">{e.nota}</p>}
                    </div>
                    <div className="col-start-2 mt-1.5 flex items-center gap-2 text-[13px] text-chumbo-2 @3xl:col-start-auto @3xl:mt-0">{e.responsavel && <><Avatar nome={e.responsavel} tamanho={22} /><span className="truncate">{e.responsavel}</span></>}</div>
                    <div className="col-start-2 mt-2 @3xl:col-start-auto @3xl:mt-0">
                      {e.situacao === "feita" ? <Selo situacao="ok">Concluída</Selo>
                        : e.situacao === "atrasada" || e.situacao === "atual" ? <Botao tamanho="p" variante={e.situacao === "atrasada" ? "principal" : "secundario"} onClick={() => { setData("2026-10-13"); setErro(undefined); setConcluindo(e); }}>Concluir</Botao>
                        : <Selo situacao="rascunho">Prevista</Selo>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {aba === "documentos" && (
              <ul className="divide-y divide-filete">
                {p.documentos.map((d) => (
                  <li key={d.nome} className="flex flex-wrap items-center gap-3 px-4 py-3 @3xl:px-5">
                    <FileText size={18} className="shrink-0 text-chumbo-3" aria-hidden />
                    <div className="min-w-0 flex-1"><p className="font-medium [overflow-wrap:anywhere]">{d.nome}</p><p className="text-[13px] text-chumbo-3">{d.tamanho}</p></div>
                    <Selo situacao={d.situacao}>{d.rotulo}</Selo>
                    {d.tamanho === "—" && <Botao tamanho="p" icone={Upload} onClick={() => avisar({ tipo: "ok", texto: `${d.nome}: arquivo enviado (simulação).` })}>Enviar</Botao>}
                  </li>
                ))}
              </ul>
            )}
            {aba === "historico" && (
              <div>
                <form className="flex flex-col gap-2 border-b border-filete px-4 py-3 @lg:flex-row @lg:items-end @3xl:px-5" onSubmit={(e) => { e.preventDefault(); if (!nota.trim()) return; setHistorico((h) => [{ quando: "Agora", quem: "Helena Duarte Vasconcelos", texto: nota.trim() }, ...h]); setNota(""); avisar({ tipo: "ok", texto: "Comentário registrado." }); }}>
                  <Campo className="flex-1" rotulo="Novo comentário interno" placeholder="Ex.: cartório pediu certidão atualizada" value={nota} onChange={(e) => setNota(e.target.value)} />
                  <Botao type="submit" icone={MessageSquarePlus} disabled={!nota.trim()}>Registrar</Botao>
                </form>
                <ol className="divide-y divide-filete">
                  {historico.map((h, i) => (
                    <li key={i} className={cx("grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm @3xl:px-5", h.quando === "Agora" && "anim-acender")}>
                      <span className="num text-chumbo-3">{h.quando}</span>
                      <span><span className="font-medium">{h.quem}</span> <span className="text-chumbo-2">{h.texto}</span></span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <aside className="min-w-0 space-y-5">
            {atrasada && (
              <section className="border border-critico/70 bg-critico-vidro px-4 py-4">
                <p className="flex items-center gap-2 font-semibold text-critico"><XCircle size={18} aria-hidden />O que está travando</p>
                <p className="mt-1.5 text-sm text-chumbo">“{atrasada.nome}” venceu em {dataBr(atrasada.prevista)}. {atrasada.nota}.</p>
                <p className="mt-1 text-sm text-chumbo-2">Responsável: {atrasada.responsavel}</p>
              </section>
            )}
            <section className="border border-chumbo bg-vidro">
              <TituloPainel descricao="Não fazem parte da sequência; aparecem quando o caso exige.">Etapas ocasionais</TituloPainel>
              <ul className="divide-y divide-filete border-t border-filete">
                {p.ocasionais.map((o) => (
                  <li key={o.nome} className="px-4 py-3 @3xl:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{o.nome}</p><Selo situacao="atencao">{o.situacao}</Selo></div>
                    <p className="num mt-1 text-[13px] text-chumbo-2 [overflow-wrap:anywhere]">{o.nota}</p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      <Dialogo aberto={!!concluindo} fechar={() => setConcluindo(null)} titulo={`Concluir “${concluindo?.nome ?? ""}”`}
        acoes={<><Botao onClick={() => setConcluindo(null)}>Cancelar</Botao><Botao variante="principal" icone={CheckCircle2} onClick={confirmar}>Concluir etapa</Botao></>}>
        <p className="mb-4">A próxima etapa passa a contar a partir desta data.</p>
        <Campo rotulo="Data da conclusão" type="date" value={data} onChange={(e) => { setData(e.target.value); setErro(undefined); }} erro={erro} ajuda="Use a data do documento, não a de hoje, se forem diferentes." />
      </Dialogo>
    </Casca>
  );
}
