import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCheck, MoreHorizontal, Pencil, Plus, Search, SearchX, Paperclip, Copy, RefreshCw } from "lucide-react";
import { Casca } from "../casca";
import { CONTAS, LANCAMENTOS, type Lancamento } from "../dados";
import { BlocoErro, Botao, Caixa, Chip, cx, Dialogo, LinhasEsqueleto, Menu, moeda, Segmentado, Selo, useAviso, Vazio, type Situacao } from "../ui";

type Filtro = "todos" | "vencido" | "hoje" | "aberto" | "pago";
const dataBr = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const SIT: Record<Lancamento["situacao"], { s: Situacao; r: string }> = {
  vencido: { s: "atrasado", r: "Vencido" }, hoje: { s: "hoje", r: "Vence hoje" }, aberto: { s: "rascunho", r: "A vencer" }, pago: { s: "ok", r: "Pago" },
};

export function TelaFinanceiro() {
  const avisar = useAviso();
  const [itens, setItens] = useState(LANCAMENTOS);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [estado, setEstado] = useState<"normal" | "carregando" | "erro">("normal");

  const contagem = (f: Filtro) => (f === "todos" ? itens.length : itens.filter((l) => l.situacao === f).length);
  const lista = useMemo(() => itens.filter((l) => (filtro === "todos" || l.situacao === filtro) && (`${l.descricao} ${l.pessoa} ${l.categoria}`.toLowerCase().includes(busca.toLowerCase()))), [itens, filtro, busca]);
  const pagaveis = lista.filter((l) => l.situacao !== "pago");
  const selecionados = itens.filter((l) => sel.includes(l.id));
  const totalSel = selecionados.reduce((s, l) => s + (l.tipo === "despesa" ? -l.valor : l.valor), 0);
  const todos = pagaveis.length > 0 && pagaveis.every((l) => sel.includes(l.id));
  const alguns = !todos && pagaveis.some((l) => sel.includes(l.id));
  const alternar = (id: string, v: boolean) => setSel((s) => (v ? [...s, id] : s.filter((x) => x !== id)));

  const darBaixa = () => {
    setBaixando(true);
    setTimeout(() => {
      const antes = itens;
      const n = sel.length;
      setItens((l) => l.map((x) => (sel.includes(x.id) ? { ...x, situacao: "pago" } : x)));
      setSel([]); setConfirmar(false); setBaixando(false);
      avisar({ tipo: "ok", texto: `Baixa registrada em ${n} ${n === 1 ? "lançamento" : "lançamentos"}.`, desfazer: () => setItens(antes) });
    }, 700);
  };

  const aPagar = itens.filter((l) => l.tipo === "despesa" && l.situacao !== "pago").reduce((s, l) => s + l.valor, 0);
  const aReceber = itens.filter((l) => l.tipo === "receita" && l.situacao !== "pago").reduce((s, l) => s + l.valor, 0);

  return (
    <Casca perfil="gestao" ativo="financeiro" usuario="Helena Duarte Vasconcelos" titulo="Financeiro">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <header className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight @3xl:text-[30px]">Lançamentos</h1>
            <p className="text-chumbo-2">Outubro de 2026 · empresa Sacra</p>
          </div>
          <div className="flex gap-2">
            <Botao icone={ArrowDownLeft} onClick={() => avisar({ tipo: "info", texto: "Nova receita (simulação)." })}>Receita</Botao>
            <Botao variante="principal" icone={Plus} onClick={() => avisar({ tipo: "info", texto: "Nova despesa (simulação)." })}>Despesa</Botao>
          </div>
        </header>

        <div className="caixilho caixilho-forte mt-5 grid-cols-2 @4xl:grid-cols-5">
          {CONTAS.map((c) => (
            <div key={c.nome} className="px-4 py-3"><p className="truncate text-[13px] text-chumbo-2">{c.nome}</p><p className="num mt-0.5 text-[17px] font-semibold">{moeda(c.saldo, 2)}</p></div>
          ))}
          <div className="px-4 py-3"><p className="text-[13px] text-chumbo-2">A pagar no mês</p><p className="num mt-0.5 text-[17px] font-semibold text-critico">{moeda(aPagar, 2)}</p></div>
          <div className="col-span-2 px-4 py-3 @4xl:col-span-1"><p className="text-[13px] text-chumbo-2">A receber no mês</p><p className="num mt-0.5 text-[17px] font-semibold text-ok">{moeda(aReceber, 2)}</p></div>
        </div>

        <section className="mt-5 border border-chumbo bg-vidro">
          <div className="flex flex-col gap-3 border-b border-filete px-4 py-3 @4xl:flex-row @4xl:items-center @3xl:px-5">
            <div className="rolagem -mx-1 flex gap-2 overflow-x-auto px-1">
              {([["todos", "Todos"], ["vencido", "Vencidos"], ["hoje", "Hoje"], ["aberto", "A vencer"], ["pago", "Pagos"]] as [Filtro, string][]).map(([f, r]) => (
                <Chip key={f} ativo={filtro === f} contagem={contagem(f)} onClick={() => { setFiltro(f); setSel([]); }}>{r}</Chip>
              ))}
            </div>
            <label className="flex h-11 min-w-0 shrink-0 items-center gap-2 border border-chumbo/45 px-3 focus-within:border-foco focus-within:ring-1 focus-within:ring-foco @4xl:ml-auto @4xl:w-72">
              <Search size={16} className="text-chumbo-3" aria-hidden />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Descrição, pessoa ou categoria" aria-label="Buscar lançamentos" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-chumbo-3 @lg:text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-filete bg-vidro-2 px-4 py-2 @3xl:px-5">
            <span className="text-[13px] text-chumbo-3">Simular:</span>
            <div className="w-full max-w-sm"><Segmentado rotulo="Simular estado" oculto valor={estado} onChange={setEstado} opcoes={[{ valor: "normal", rotulo: "Normal" }, { valor: "carregando", rotulo: "Carregando" }, { valor: "erro", rotulo: "Erro" }]} /></div>
          </div>

          {sel.length > 0 && estado === "normal" && (
            <div className="anim-surgir sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-chumbo bg-chumbo px-4 py-2.5 text-vidro @3xl:px-5">
              <span className="text-sm font-medium">{sel.length} {sel.length === 1 ? "selecionado" : "selecionados"} · <span className="num">{moeda(Math.abs(totalSel), 2)}</span></span>
              <button type="button" onClick={() => setSel([])} className="text-sm text-vidro/75 underline-offset-2 hover:underline">Limpar</button>
              <button type="button" onClick={() => setConfirmar(true)} className="ml-auto inline-flex h-9 items-center gap-2 bg-ouro-luz px-3 text-sm font-semibold text-[#221e1d]"><CheckCheck size={16} aria-hidden />Dar baixa</button>
            </div>
          )}

          {estado === "carregando" ? <LinhasEsqueleto linhas={6} />
            : estado === "erro" ? <div className="p-4 @3xl:p-5"><BlocoErro titulo="Não foi possível carregar os lançamentos" texto="A conexão com o banco caiu antes da resposta. Nenhum dado foi alterado." acao={<Botao tamanho="p" icone={RefreshCw} onClick={() => setEstado("normal")}>Tentar de novo</Botao>} /></div>
            : lista.length === 0 ? (
              <Vazio icone={SearchX} titulo={busca ? `Nada encontrado para “${busca}”` : "Nenhum lançamento nesta situação"} texto={busca ? "Confira a grafia ou procure pelo nome da pessoa ou da categoria." : "Quando houver lançamentos nesta situação, eles aparecem aqui."} acao={<Botao tamanho="p" onClick={() => { setBusca(""); setFiltro("todos"); }}>Limpar busca e filtros</Botao>} />
            ) : (
              <>
                {/* tabela (computador) */}
                <div className="hidden @4xl:block">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-filete bg-vidro-2 text-left text-[12.5px] text-chumbo-3">
                        <th className="w-10 py-2 pl-5"><Caixa rotulo="Selecionar todos" marcado={todos} misto={alguns} onChange={(v) => setSel(v ? pagaveis.map((l) => l.id) : [])} /></th>
                        <th className="px-3 py-2 font-medium">Vencimento</th>
                        <th className="px-3 py-2 font-medium">Descrição</th>
                        <th className="px-3 py-2 font-medium">Categoria</th>
                        <th className="px-3 py-2 font-medium">Conta</th>
                        <th className="px-3 py-2 font-medium">Situação</th>
                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                        <th className="w-12 pr-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-filete">
                      {lista.map((l) => (
                        <tr key={l.id} className={cx("align-top transition-colors", sel.includes(l.id) ? "bg-ouro-vidro" : "hover:bg-vidro-2")}>
                          <td className="py-3 pl-5">{l.situacao !== "pago" && <Caixa rotulo={`Selecionar ${l.descricao}`} marcado={sel.includes(l.id)} onChange={(v) => alternar(l.id, v)} />}</td>
                          <td className={cx("num px-3 py-3 font-medium", l.situacao === "vencido" && "text-critico")}>{dataBr(l.vencimento)}</td>
                          <td className="max-w-[420px] px-3 py-3"><p className="font-medium leading-snug">{l.descricao}</p><p className="text-[13px] text-chumbo-3">{l.pessoa}</p></td>
                          <td className="px-3 py-3 text-chumbo-2">{l.categoria}</td>
                          <td className="px-3 py-3 text-chumbo-2">{l.conta}</td>
                          <td className="px-3 py-3"><Selo situacao={SIT[l.situacao].s}>{SIT[l.situacao].r}</Selo></td>
                          <td className={cx("num whitespace-nowrap px-3 py-3 text-right font-semibold", l.tipo === "receita" ? "text-ok" : "text-chumbo")}>{l.tipo === "receita" ? "+ " : "− "}{moeda(l.valor, 2)}</td>
                          <td className="py-2 pr-3"><AcoesLinha l={l} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* cartões (celular) */}
                <ul className="divide-y divide-filete @4xl:hidden">
                  {lista.map((l) => (
                    <li key={l.id} className={cx("flex gap-3 px-4 py-3", sel.includes(l.id) && "bg-ouro-vidro")}>
                      <div className="pt-0.5">{l.situacao !== "pago" ? <Caixa rotulo={`Selecionar ${l.descricao}`} marcado={sel.includes(l.id)} onChange={(v) => alternar(l.id, v)} /> : <span className="block w-[18px]" />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 font-medium leading-snug">{l.descricao}</p>
                          <p className={cx("num shrink-0 font-semibold", l.tipo === "receita" ? "text-ok" : "text-chumbo")}>{l.tipo === "receita" ? "+" : "−"}{moeda(l.valor, 2)}</p>
                        </div>
                        <p className="truncate text-[13px] text-chumbo-3">{l.pessoa} · {l.conta}</p>
                        <div className="mt-1.5 flex items-center gap-2"><Selo situacao={SIT[l.situacao].s}>{SIT[l.situacao].r}</Selo><span className="num text-[13px] text-chumbo-2">{dataBr(l.vencimento)}</span></div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between gap-3 border-t border-chumbo bg-vidro-2 px-4 py-2.5 text-sm @3xl:px-5">
                  <span className="text-chumbo-2">{lista.length} lançamentos</span>
                  <span className="num font-semibold">Saldo da lista {moeda(lista.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0), 2)}</span>
                </div>
              </>
            )}
        </section>
      </div>

      <Dialogo aberto={confirmar} fechar={() => !baixando && setConfirmar(false)} titulo={`Dar baixa em ${sel.length} ${sel.length === 1 ? "lançamento" : "lançamentos"}?`}
        acoes={<><Botao onClick={() => setConfirmar(false)} disabled={baixando}>Cancelar</Botao><Botao variante="principal" icone={CheckCheck} carregando={baixando} onClick={darBaixa}>{baixando ? "Registrando…" : "Dar baixa"}</Botao></>}>
        <p>A baixa usa a data de hoje (13/10) e a conta de cada lançamento.</p>
        <ul className="mt-3 divide-y divide-filete border-y border-filete text-sm">
          {selecionados.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate text-chumbo">{l.descricao}</span><span className="num shrink-0">{moeda(l.valor, 2)}</span></li>)}
        </ul>
      </Dialogo>
    </Casca>
  );
}

function AcoesLinha({ l }: { l: Lancamento }) {
  const avisar = useAviso();
  return (
    <Menu rotulo={`Ações de ${l.descricao}`} gatilho={<MoreHorizontal size={18} />} itens={[
      { rotulo: "Editar", icone: Pencil, acao: () => avisar({ tipo: "info", texto: "Edição (simulação)." }) },
      { rotulo: "Anexar comprovante", icone: Paperclip, acao: () => avisar({ tipo: "info", texto: "PDF, JPG ou PNG até 3 MB (simulação)." }) },
      { rotulo: "Duplicar para o próximo mês", icone: Copy, acao: () => avisar({ tipo: "ok", texto: "Lançamento duplicado para novembro (simulação)." }) },
      { rotulo: l.tipo === "receita" ? "Ver origem da receita" : "Ver fornecedor", icone: ArrowUpRight, acao: () => avisar({ tipo: "info", texto: l.pessoa }) },
    ]} />
  );
}
