import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, Filter, PartyPopper, Wallet } from "lucide-react";
import { Casca, type Perfil } from "../casca";
import { CONTAS, MINHAS_VENDAS, PRIORIDADES, RESULTADOS, type Prioridade } from "../dados";
import { Avatar, Botao, Campo, cx, moeda, PainelLateral, ROTULO_AREA, Segmentado, Selo, TituloPainel, useAviso, Vazio, VidroArea, type Area } from "../ui";

type Faixa = "atrasado" | "hoje" | "semana";
const FAIXAS: { chave: Faixa; rotulo: string }[] = [
  { chave: "atrasado", rotulo: "Atrasado" },
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "semana", rotulo: "7 dias" },
];
const faixaDe = (p: Prioridade): Faixa => (p.dias < 0 ? "atrasado" : p.dias === 0 ? "hoje" : "semana");
const COR_FAIXA: Record<Faixa, string> = { atrasado: "var(--critico)", hoje: "var(--atencao)", semana: "var(--info)" };
const VIDRO_FAIXA: Record<Faixa, string> = { atrasado: "var(--critico-vidro)", hoje: "var(--atencao-vidro)", semana: "var(--info-vidro)" };

export function TelaInicio({ perfilInicial = "gestao" }: { perfilInicial?: Perfil }) {
  const [perfil, setPerfil] = useState<Perfil>(perfilInicial);
  const usuario = perfil === "corretor" ? "Marina Albuquerque de Sá Figueiredo" : perfil === "gestao" ? "Helena Duarte Vasconcelos" : "Otávio Lins";
  return (
    <Casca perfil={perfil} ativo="inicio" usuario={usuario} titulo="Início">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <div className="mb-5 max-w-md">
          <Segmentado rotulo="Perfil de demonstração" valor={perfil} onChange={setPerfil} opcoes={[{ valor: "gestao", rotulo: "Gestão" }, { valor: "operacional", rotulo: "Operacional" }, { valor: "corretor", rotulo: "Corretor" }]} />
        </div>
        {perfil === "corretor" ? <InicioCorretor /> : <InicioEquipe perfil={perfil} usuario={usuario} />}
      </div>
    </Casca>
  );
}

function InicioEquipe({ perfil, usuario }: { perfil: Perfil; usuario: string }) {
  const avisar = useAviso();
  const [feitas, setFeitas] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<{ area?: Area; faixa?: Faixa }>({});
  const [aberta, setAberta] = useState<Prioridade | null>(null);
  const visiveis = PRIORIDADES.filter((p) => (perfil === "gestao" || p.area !== "financeiro") && !feitas.includes(p.id));
  const areas = useMemo(() => Array.from(new Set(PRIORIDADES.map((p) => p.area))).filter((a) => perfil === "gestao" || a !== "financeiro"), [perfil]);
  const lista = visiveis.filter((p) => (!filtro.area || p.area === filtro.area) && (!filtro.faixa || faixaDe(p) === filtro.faixa)).sort((a, b) => a.dias - b.dias);
  const contar = (area: Area, faixa: Faixa) => visiveis.filter((p) => p.area === area && faixaDe(p) === faixa).length;
  const total = (f: Faixa) => visiveis.filter((p) => faixaDe(p) === f).length;
  const concluir = (p: Prioridade) => {
    setFeitas((l) => [...l, p.id]);
    setAberta(null);
    avisar({ tipo: "ok", texto: `“${p.titulo}” marcada como feita.`, desfazer: () => setFeitas((l) => l.filter((x) => x !== p.id)) });
  };
  const primeiroNome = usuario.split(" ")[0];

  return (
    <>
      <header className="mb-5 flex flex-col gap-1">
        <p className="text-sm text-chumbo-3">Terça-feira, 13 de outubro</p>
        <h1 className="text-[28px] font-bold leading-[1.1] @3xl:text-[34px]">Bom dia, {primeiroNome}.</h1>
        <p className="max-w-[60ch] text-[15px] text-chumbo-2">
          {total("atrasado") + total("hoje") === 0 ? "Nada atrasado nem vencendo hoje." : <>Há <strong className="text-chumbo">{total("atrasado")} pendências atrasadas</strong> e <strong className="text-chumbo">{total("hoje")} que vencem hoje</strong>. Comece pelas atrasadas.</>}
        </p>
      </header>

      <div className="grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Vitral do dia: área × urgência. A cor só aparece onde há trabalho. */}
          <section aria-labelledby="vitral-dia" className="border border-chumbo bg-vidro">
            <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-4 pb-3 @3xl:px-5">
              <div>
                <h2 id="vitral-dia" className="text-[16px] font-semibold">O dia, por área</h2>
                <p className="text-[13px] text-chumbo-3">Toque num vidro para ver só aquelas pendências.</p>
              </div>
              {(filtro.area || filtro.faixa) && <Botao tamanho="p" variante="discreto" icone={Filter} onClick={() => setFiltro({})}>Limpar filtro</Botao>}
            </div>
            <div className="rolagem overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-y border-filete bg-vidro-2 text-left text-[12.5px] text-chumbo-3">
                    <th scope="col" className="w-[38%] px-3 py-2 font-medium @lg:px-4 @3xl:px-5">Área</th>
                    {FAIXAS.map((f) => (
                      <th key={f.chave} scope="col" className="border-l border-filete px-2 py-2 font-medium @lg:px-3">
                        <button type="button" onClick={() => setFiltro((x) => ({ ...x, faixa: x.faixa === f.chave ? undefined : f.chave }))} className={cx("flex items-center gap-1.5 whitespace-nowrap", filtro.faixa === f.chave && "font-semibold text-chumbo")}>
                          <span aria-hidden className="hidden size-2 shrink-0 @lg:inline-block" style={{ background: COR_FAIXA[f.chave] }} />{f.rotulo} <span className="num">{total(f.chave)}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a} className="border-b border-filete last:border-b-0">
                      <th scope="row" className="px-3 py-0 text-left font-medium @lg:px-4 @3xl:px-5"><button type="button" onClick={() => setFiltro((x) => ({ ...x, area: x.area === a ? undefined : a }))} className={cx("flex h-12 items-center", filtro.area === a && "font-semibold underline decoration-2 underline-offset-4")}><VidroArea area={a} /></button></th>
                      {FAIXAS.map((f) => {
                        const n = contar(a, f.chave);
                        const sel = filtro.area === a && filtro.faixa === f.chave;
                        return (
                          <td key={f.chave} className="border-l border-filete p-0">
                            <button type="button" disabled={!n} aria-label={`${ROTULO_AREA[a]}, ${f.rotulo}: ${n}`} onClick={() => setFiltro(sel ? {} : { area: a, faixa: f.chave })}
                              className={cx("flex h-12 w-full items-center gap-2 px-3 text-left transition-[background-color] duration-[var(--movimento-medio)]", n ? "cursor-pointer" : "cursor-default", sel && "outline-2 -outline-offset-2 outline-chumbo")}
                              style={{ background: n ? VIDRO_FAIXA[f.chave] : undefined }}>
                              <span className={cx("num font-titulo text-[20px] font-bold leading-none", !n && "text-filete")} style={{ color: n ? COR_FAIXA[f.chave] : undefined }}>{n || "·"}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="proximos" className="border border-chumbo bg-vidro">
            <TituloPainel descricao={filtro.area || filtro.faixa ? `Filtrado: ${[filtro.area && ROTULO_AREA[filtro.area], filtro.faixa && FAIXAS.find((f) => f.chave === filtro.faixa)?.rotulo].filter(Boolean).join(" e ")}` : "Em ordem de urgência. Cada linha já traz a próxima ação."}>
              <span id="proximos">Próximos passos</span>
            </TituloPainel>
            {lista.length === 0 ? (
              <Vazio icone={PartyPopper} titulo="Nada pendente aqui" texto="Não há pendências com esse filtro. Limpe o filtro para ver o restante do dia." acao={<Botao tamanho="p" onClick={() => setFiltro({})}>Ver todas</Botao>} />
            ) : (
              <ul className="divide-y divide-filete border-t border-filete">
                {lista.map((p) => (
                  <li key={p.id} className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-2 px-4 py-3 @3xl:grid-cols-[minmax(0,1fr)_140px_auto] @3xl:items-center @3xl:px-5">
                    <button type="button" onClick={() => setAberta(p)} className="group min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><VidroArea area={p.area} /><Selo situacao={p.situacao}>{p.quando}</Selo></div>
                      <p className="mt-1 font-medium leading-snug group-hover:underline">{p.titulo}</p>
                      <p className="truncate text-[13px] text-chumbo-3">{p.contexto}</p>
                    </button>
                    <div className="hidden items-center gap-2 text-[13px] text-chumbo-2 @3xl:flex"><Avatar nome={p.responsavel} tamanho={24} /><span className="truncate">{p.responsavel.split(" ")[0]}</span></div>
                    <Botao tamanho="p" variante={p.dias < 0 ? "principal" : "secundario"} onClick={() => setAberta(p)} className="col-start-2 row-start-1 @3xl:col-start-auto @3xl:row-start-auto">{p.acao.split(" ")[0]}</Botao>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          {perfil === "gestao" && (
            <section className="caixilho caixilho-forte">
              <div>
                <TituloPainel acao={<Wallet size={17} className="text-chumbo-3" aria-hidden />}>Dinheiro hoje</TituloPainel>
                <dl className="divide-y divide-filete border-t border-filete text-sm">
                  {CONTAS.map((c) => <div key={c.nome} className="flex justify-between gap-3 px-4 py-2.5 @3xl:px-5"><dt className="truncate text-chumbo-2">{c.nome}</dt><dd className="num font-medium">{moeda(c.saldo, 2)}</dd></div>)}
                  <div className="flex justify-between gap-3 bg-atencao-vidro px-4 py-2.5 @3xl:px-5"><dt className="font-medium text-atencao">A pagar hoje (2)</dt><dd className="num font-semibold text-atencao">{moeda(536.08, 2)}</dd></div>
                </dl>
              </div>
              <div className="px-4 py-4 @3xl:px-5">
                <div className="flex items-baseline justify-between"><p className="text-sm text-chumbo-2">VGV de 2026</p><p className="num text-[13px] text-chumbo-3">meta {moeda(RESULTADOS.metaVgv)}</p></div>
                <p className="num mt-1 font-titulo text-[26px] font-bold leading-none">{moeda(RESULTADOS.vgv)}</p>
                <div className="mt-3 h-2 bg-vidro-2 ring-1 ring-inset ring-filete" role="img" aria-label={`${Math.round((RESULTADOS.vgv / RESULTADOS.metaVgv) * 100)}% da meta anual`}>
                  <div className="h-full bg-ouro-luz" style={{ width: `${(RESULTADOS.vgv / RESULTADOS.metaVgv) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[13px] text-chumbo-3">{Math.round((RESULTADOS.vgv / RESULTADOS.metaVgv) * 100)}% da meta, com 2,5 meses pela frente.</p>
              </div>
            </section>
          )}
          <section className="border border-chumbo bg-vidro">
            <TituloPainel acao={<CalendarDays size={17} className="text-chumbo-3" aria-hidden />}>Agenda de hoje</TituloPainel>
            <ol className="divide-y divide-filete border-t border-filete text-sm">
              {[["10:00", "Assinatura no 2º Ofício de Notas", "Venda 2026/028 · Lago Sul"], ["14:30", "Vistoria de entrada", "CLN 205 Bloco B loja 12"], ["17:00", "Reunião semanal da equipe", "Sala de reunião"]].map(([h, t, c]) => (
                <li key={h} className="grid grid-cols-[52px_1fr] gap-3 px-4 py-2.5 @3xl:px-5"><span className="num font-semibold">{h}</span><span className="min-w-0"><span className="block font-medium">{t}</span><span className="block truncate text-[13px] text-chumbo-3">{c}</span></span></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <PainelLateral aberto={!!aberta} fechar={() => setAberta(null)} titulo={aberta?.titulo ?? ""} subtitulo={aberta && <span className="flex flex-wrap items-center gap-2"><VidroArea area={aberta.area} /><Selo situacao={aberta.situacao}>{aberta.quando}</Selo></span>}
        rodape={aberta && <><Botao onClick={() => setAberta(null)}>Fechar</Botao><Botao variante="principal" icone={CheckCircle2} onClick={() => concluir(aberta)}>Marcar como feita</Botao></>}>
        {aberta && (
          <div className="space-y-5">
            <dl className="caixilho text-sm">
              <div className="px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Onde</dt><dd className="mt-0.5">{aberta.contexto}</dd></div>
              <div className="px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Responsável</dt><dd className="mt-0.5 flex items-center gap-2"><Avatar nome={aberta.responsavel} tamanho={22} />{aberta.responsavel}</dd></div>
              <div className="px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Próxima ação</dt><dd className="mt-0.5 font-medium">{aberta.acao}</dd></div>
            </dl>
            <div className="grid gap-4 @lg:grid-cols-2">
              <Campo rotulo="Data em que foi feita" type="date" defaultValue="2026-10-13" />
              <Campo rotulo="Observação" opcional placeholder="Ex.: cartório confirmou por telefone" />
            </div>
            <a href="#telas-processo" className="inline-flex items-center gap-1.5 text-sm font-medium text-bordo underline-offset-4 hover:underline">Abrir o processo completo <ArrowUpRight size={15} aria-hidden /></a>
          </div>
        )}
      </PainelLateral>
    </>
  );
}

function InicioCorretor() {
  const recebidas = MINHAS_VENDAS.reduce((s, v) => s + v.comissaoRecebida, 0);
  const previstas = MINHAS_VENDAS.filter((v) => v.situacao !== "ok").reduce((s, v) => s + (v.comissaoPrevista ?? 0), 0);
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-chumbo-3">Terça-feira, 13 de outubro</p>
        <h1 className="text-[28px] font-bold leading-[1.1] @3xl:text-[34px]">Bom dia, Marina.</h1>
        <p className="mt-1 max-w-[60ch] text-[15px] text-chumbo-2">Uma das suas vendas está atrasada e outra tem prazo hoje.</p>
      </header>
      <div className="caixilho caixilho-forte mb-5 grid-cols-2 @3xl:grid-cols-3">
        <div className="px-4 py-4"><p className="text-sm text-chumbo-2">Vendas em andamento</p><p className="num mt-1 font-titulo text-[26px] font-bold">3</p></div>
        <div className="px-4 py-4"><p className="text-sm text-chumbo-2">Comissão a receber</p><p className="num mt-1 font-titulo text-[26px] font-bold">{moeda(previstas)}</p><p className="text-[12.5px] text-chumbo-3">1 venda sem valor cadastrado</p></div>
        <div className="col-span-2 px-4 py-4 @3xl:col-span-1"><p className="text-sm text-chumbo-2">Recebido em 2026</p><p className="num mt-1 font-titulo text-[26px] font-bold">{moeda(recebidas)}</p></div>
      </div>
      <section className="border border-chumbo bg-vidro">
        <TituloPainel descricao="O que a equipe da Sacra registrou por último em cada venda.">Minhas vendas</TituloPainel>
        <ul className="divide-y divide-filete border-t border-filete">
          {MINHAS_VENDAS.filter((v) => v.situacao !== "ok").map((v) => (
            <li key={v.id} className="px-4 py-3 @3xl:px-5">
              <div className="flex flex-wrap items-center gap-2"><Selo situacao={v.situacao}>{v.quando}</Selo><span className="text-[13px] text-chumbo-3">{v.etapa}</span></div>
              <p className="mt-1 font-medium">{v.imovel}</p>
              <p className="text-[13px] text-chumbo-2">{v.ultimaAtualizacao}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-filete px-4 py-3 @3xl:px-5"><a href="#telas-minhas" className="text-sm font-medium text-bordo underline-offset-4 hover:underline">Ver todas as vendas e comissões</a></div>
      </section>
    </>
  );
}
