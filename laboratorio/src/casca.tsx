/* Moldura de dispositivo e casca do Vitral proposta (navegação). */
import { useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, FileSignature, FolderKanban, Home, LayoutGrid, Monitor, Ruler, Search, Smartphone, Users, Wallet, X, Plus, ChevronRight, Bell } from "lucide-react";
import { Avatar, cx, ProvedorAvisos, Segmentado } from "./ui";

export type Dispositivo = "computador" | "celular";

/** Palco: mostra uma tela em largura de computador ou dentro de um celular de 390 px. */
export function Palco({ children, altura = 820, inicial = "computador" }: { children: (d: Dispositivo) => ReactNode; altura?: number; inicial?: Dispositivo }) {
  const [disp, setDisp] = useState<Dispositivo>(inicial);
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Segmentado rotulo="Ver como" oculto valor={disp} onChange={setDisp} opcoes={[{ valor: "computador", rotulo: "Computador", icone: Monitor }, { valor: "celular", rotulo: "Celular", icone: Smartphone }]} />
        </div>
        <p className="text-[13px] text-chumbo-3">{disp === "computador" ? "Largura livre: redimensione a janela para ver a composição se ajustar." : "Moldura de 390 × 780 px, a largura de um celular comum."}</p>
      </div>
      {disp === "computador" ? (
        <div className="@container relative overflow-hidden border border-chumbo bg-cal" style={{ height: altura, transform: "translateZ(0)" }}>
          <ProvedorAvisos>{children(disp)}</ProvedorAvisos>
        </div>
      ) : (
        <div className="flex justify-center bg-vidro-2 py-6 ring-1 ring-inset ring-filete">
          <div className="@container relative overflow-hidden border-[10px] border-chumbo bg-cal" style={{ width: 410, height: 800, maxWidth: "100%", borderRadius: 34, transform: "translateZ(0)" }}>
            <ProvedorAvisos>{children(disp)}</ProvedorAvisos>
          </div>
        </div>
      )}
    </div>
  );
}

export type Perfil = "gestao" | "operacional" | "corretor";
type ItemNav = { id: string; rotulo: string; icone: typeof Home; contagem?: number };
export function navPorPerfil(perfil: Perfil): ItemNav[] {
  if (perfil === "corretor") return [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "minhas", rotulo: "Minhas vendas", icone: FolderKanban },
    { id: "documentos", rotulo: "Documentos", icone: FileSignature },
    { id: "ferramentas", rotulo: "Ferramentas", icone: Ruler },
  ];
  const base: ItemNav[] = [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "processos", rotulo: "Processos", icone: FolderKanban, contagem: 4 },
    { id: "agenda", rotulo: "Agenda", icone: CalendarDays },
    { id: "documentos", rotulo: "Documentos", icone: FileSignature },
    { id: "avaliacoes", rotulo: "Avaliações", icone: Ruler },
  ];
  if (perfil === "gestao") base.splice(4, 0, { id: "financeiro", rotulo: "Financeiro", icone: Wallet, contagem: 3 }, { id: "resultados", rotulo: "Resultados", icone: BarChart3 }, { id: "pessoas", rotulo: "Pessoas", icone: Users });
  return base;
}

/**
 * Casca do Vitral: no computador, trilho lateral estreito com rótulos;
 * no celular, barra inferior com 4 destinos + "Mais". Busca e criação
 * ficam num só lugar ("Buscar ou criar").
 */
export function Casca({ perfil, ativo, usuario, children, onNavegar, titulo }: { perfil: Perfil; ativo: string; usuario: string; children: ReactNode; onNavegar?: (id: string) => void; titulo: string }) {
  const nav = navPorPerfil(perfil);
  const [mais, setMais] = useState(false);
  const [busca, setBusca] = useState(false);
  const principais = nav.slice(0, 4);
  return (
    <div className="relative flex h-full min-h-0 flex-col @4xl:flex-row">
      {/* trilho lateral (computador) */}
      <nav aria-label="Navegação principal" className="hidden w-56 shrink-0 flex-col border-r border-chumbo bg-vidro @4xl:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-filete px-4">
          <MarcaVitral />
          <span className="font-titulo text-[17px] font-bold tracking-tight">Vitral</span>
          <span className="ml-auto text-[11px] text-chumbo-3">Sacra</span>
        </div>
        <button type="button" onClick={() => setBusca(true)} className="mx-3 mt-3 flex h-10 items-center gap-2 border border-filete bg-vidro-2 px-3 text-left text-sm text-chumbo-3 hover:border-chumbo/50">
          <Search size={15} aria-hidden /> Buscar ou criar
          <kbd className="ml-auto font-texto text-[11px] text-chumbo-3">Ctrl K</kbd>
        </button>
        <ul className="mt-3 flex-1 space-y-0.5 px-2">
          {nav.map((n) => {
            const I = n.icone;
            const sel = n.id === ativo;
            return (
              <li key={n.id}>
                <button type="button" aria-current={sel ? "page" : undefined} onClick={() => onNavegar?.(n.id)}
                  className={cx("relative flex h-10 w-full items-center gap-3 px-3 text-sm transition-colors", sel ? "bg-chumbo font-semibold text-vidro" : "text-chumbo-2 hover:bg-vidro-2 hover:text-chumbo")}>
                  <I size={17} aria-hidden strokeWidth={sel ? 2.3 : 1.9} />
                  {n.rotulo}
                  {n.contagem != null && <span className={cx("num ml-auto min-w-5 px-1 text-center text-[11px] font-bold", sel ? "bg-ouro-luz text-chumbo" : "bg-critico-vidro text-critico")}>{n.contagem}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2.5 border-t border-filete px-4 py-3">
          <Avatar nome={usuario} />
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{usuario}</p>
            <p className="text-xs text-chumbo-3">{perfil === "gestao" ? "Gestão" : perfil === "operacional" ? "Operacional" : "Corretor(a)"}</p>
          </div>
        </div>
      </nav>

      {/* topo (celular) */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-chumbo bg-vidro px-3 @4xl:hidden">
        <MarcaVitral />
        <span className="min-w-0 flex-1 truncate font-titulo text-[17px] font-bold">{titulo}</span>
        <button type="button" aria-label="Buscar ou criar" onClick={() => setBusca(true)} className="flex size-11 items-center justify-center text-chumbo-2"><Search size={19} /></button>
        <button type="button" aria-label="Avisos" className="relative flex size-11 items-center justify-center text-chumbo-2"><Bell size={19} /><span className="absolute right-2.5 top-2.5 size-2 bg-critico" /></button>
      </header>

      <main className="rolagem min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>

      {/* barra inferior (celular) */}
      <nav aria-label="Navegação principal" className="grid shrink-0 grid-cols-5 border-t border-chumbo bg-vidro @4xl:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {principais.map((n) => {
          const I = n.icone;
          const sel = n.id === ativo;
          return (
            <button key={n.id} type="button" aria-current={sel ? "page" : undefined} onClick={() => onNavegar?.(n.id)} className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px]", sel ? "font-semibold text-chumbo" : "text-chumbo-3")}>
              {sel && <span className="absolute inset-x-3 top-0 h-[3px] bg-ouro-luz" aria-hidden />}
              <I size={20} aria-hidden strokeWidth={sel ? 2.3 : 1.8} />
              <span className="max-w-full truncate px-1">{n.rotulo}</span>
              {n.contagem != null && <span className="num absolute right-[22%] top-2 bg-critico px-1 text-[10px] font-bold text-vidro">{n.contagem}</span>}
            </button>
          );
        })}
        <button type="button" onClick={() => setMais(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-chumbo-3"><LayoutGrid size={20} aria-hidden />Mais</button>
      </nav>

      {mais && (
        <div className="absolute inset-0 z-40 flex items-end bg-chumbo/40 @4xl:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMais(false)}>
          <div className="anim-subir w-full border-t border-chumbo bg-vidro pb-4">
            <div className="flex items-center justify-between border-b border-filete px-4 py-3"><p className="font-titulo font-semibold">Todas as áreas</p><button type="button" aria-label="Fechar" onClick={() => setMais(false)} className="flex size-10 items-center justify-center"><X size={18} /></button></div>
            <ul className="grid grid-cols-3 gap-px bg-filete">
              {nav.map((n) => { const I = n.icone; return (
                <li key={n.id} className="bg-vidro"><button type="button" onClick={() => { setMais(false); onNavegar?.(n.id); }} className="flex h-20 w-full flex-col items-center justify-center gap-1.5 text-[13px]"><I size={20} aria-hidden />{n.rotulo}</button></li>
              ); })}
            </ul>
          </div>
        </div>
      )}
      {busca && <PaletaComandos fechar={() => setBusca(false)} />}
    </div>
  );
}

function PaletaComandos({ fechar }: { fechar: () => void }) {
  const [q, setQ] = useState("");
  const acoes = [
    { grupo: "Criar", itens: ["Novo processo de venda", "Novo estudo de mercado", "Nova despesa", "Nova autorização de venda"] },
    { grupo: "Ir para", itens: ["SQN 312 Bloco K apto 504 · Venda 2026/031", "Residencial Parque das Águas, torre 2, apto 1.107", "Contas a pagar desta semana", "Resultados de 2026"] },
  ];
  const filtro = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-chumbo/40 p-3 pt-[12%]" onMouseDown={(e) => e.target === e.currentTarget && fechar()} onKeyDown={(e) => e.key === "Escape" && fechar()}>
      <div role="dialog" aria-label="Buscar ou criar" className="anim-surgir w-full max-w-lg border border-chumbo bg-vidro shadow-[var(--sombra-flutuante)]">
        <div className="flex items-center gap-2 border-b border-filete px-3">
          <Search size={17} className="text-chumbo-3" aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Endereço, cliente, processo ou ação…" className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-chumbo-3" aria-label="Buscar" />
          <button type="button" onClick={fechar} className="text-xs text-chumbo-3">Esc</button>
        </div>
        <div className="rolagem max-h-80 overflow-y-auto py-1">
          {acoes.map((g) => {
            const itens = g.itens.filter(filtro);
            if (!itens.length) return null;
            return (
              <div key={g.grupo}>
                <p className="px-3 pb-1 pt-2 text-[12px] font-semibold text-chumbo-3">{g.grupo}</p>
                {itens.map((it) => (
                  <button key={it} type="button" onClick={fechar} className="flex h-10 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-vidro-2 focus:bg-vidro-2 focus:outline-none">
                    {g.grupo === "Criar" ? <Plus size={15} className="text-ouro" aria-hidden /> : <ChevronRight size={15} className="text-chumbo-3" aria-hidden />}
                    <span className="truncate">{it}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {acoes.every((g) => !g.itens.some(filtro)) && <p className="px-3 py-6 text-sm text-chumbo-2">Nada encontrado para “{q}”. Tente o endereço, o nome do cliente ou o código do processo.</p>}
        </div>
      </div>
    </div>
  );
}

/** Marca do Vitral redesenhada para a interface: arco de janela dividido em vidros. */
export function MarcaVitral({ tamanho = 26 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <path d="M4 30V14a12 12 0 0 1 24 0v16Z" fill="var(--bordo)" />
      <path d="M16 2v28M4 18h24M10 18v12M22 18v12M8.5 6.5 16 14l7.5-7.5" stroke="var(--vidro)" strokeWidth="1.6" fill="none" />
      <rect x="16.8" y="18.8" width="4.4" height="10.4" fill="var(--ouro-luz)" />
    </svg>
  );
}
