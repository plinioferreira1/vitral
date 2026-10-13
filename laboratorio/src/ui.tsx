/* Componentes do sistema "Caixilho". Cada um tem um papel; nenhum é decoração. */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, CircleDashed, Clock, Info, Loader2, X, XCircle, type LucideIcon } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const moeda = (v: number | null | undefined, casas = 0) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
export const numero = (v: number, casas = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const compacto = (v: number) =>
  v >= 1_000_000 ? `R$ ${numero(v / 1_000_000, 1)} mi` : v >= 1_000 ? `R$ ${numero(v / 1_000, 0)} mil` : moeda(v);

// ---------------------------------------------------------------- botões

type VarianteBotao = "principal" | "secundario" | "discreto" | "perigo";
export function Botao({ variante = "secundario", tamanho = "m", icone: Icone, carregando, children, className, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao; tamanho?: "p" | "m"; icone?: LucideIcon; carregando?: boolean }) {
  return (
    <button
      type="button"
      {...resto}
      disabled={resto.disabled || carregando}
      aria-busy={carregando || undefined}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow] duration-[var(--movimento-rapido)] disabled:cursor-not-allowed",
        tamanho === "p" ? "h-9 px-3 text-sm" : "h-11 px-4 text-[15px]",
        variante === "principal" && "bg-bordo text-vidro hover:bg-bordo-vivo disabled:opacity-60",
        variante === "secundario" && "border border-chumbo/80 bg-vidro text-chumbo hover:bg-vidro-2 disabled:border-filete disabled:text-chumbo-3",
        variante === "discreto" && "text-chumbo hover:bg-vidro-2 disabled:text-chumbo-3",
        variante === "perigo" && "bg-critico text-vidro hover:opacity-90 disabled:opacity-60",
        className,
      )}
    >
      {carregando ? <Loader2 size={16} className="animate-spin" aria-hidden /> : Icone && <Icone size={16} aria-hidden strokeWidth={2} />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- campos

export function Campo({ rotulo, ajuda, erro, opcional, prefixo, sufixo, className, ...resto }: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; ajuda?: string; erro?: string; opcional?: boolean; prefixo?: string; sufixo?: string }) {
  const id = useId();
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-chumbo">
        <span>{rotulo}</span>
        {opcional && <span className="text-xs font-normal text-chumbo-3">opcional</span>}
      </label>
      <div className={cx("flex h-11 items-center border bg-vidro transition-colors focus-within:border-foco focus-within:ring-1 focus-within:ring-foco", erro ? "border-critico" : "border-chumbo/45 hover:border-chumbo/70")}>
        {prefixo && <span className="pl-3 text-sm text-chumbo-3">{prefixo}</span>}
        <input id={id} aria-invalid={!!erro || undefined} aria-describedby={erro || ajuda ? `${id}-d` : undefined} className="num h-full w-full min-w-0 bg-transparent px-3 text-base text-chumbo outline-none placeholder:text-chumbo-3 @lg:text-[15px]" {...resto} />
        {sufixo && <span className="pr-3 text-sm text-chumbo-3">{sufixo}</span>}
      </div>
      {(erro || ajuda) && (
        <p id={`${id}-d`} className={cx("mt-1.5 flex items-start gap-1.5 text-[13px] leading-5", erro ? "text-critico" : "text-chumbo-3")}>
          {erro && <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden />}
          {erro ?? ajuda}
        </p>
      )}
    </div>
  );
}

export function Selecao({ rotulo, opcoes, ajuda, className, ...resto }: SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string; opcoes: { valor: string; rotulo: string }[]; ajuda?: string }) {
  const id = useId();
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{rotulo}</label>
      <div className="relative">
        <select id={id} className="h-11 w-full appearance-none border border-chumbo/45 bg-vidro pl-3 pr-9 text-base text-chumbo outline-none hover:border-chumbo/70 focus:border-foco focus:ring-1 focus:ring-foco @lg:text-[15px]" {...resto}>
          {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-chumbo-2" aria-hidden />
      </div>
      {ajuda && <p className="mt-1.5 text-[13px] text-chumbo-3">{ajuda}</p>}
    </div>
  );
}

/** Escolha única com poucas opções sempre visíveis (substitui selects de 2 a 5 itens). */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, onChange, oculto }: { rotulo: string; opcoes: { valor: T; rotulo: string; icone?: LucideIcon }[]; valor: T; onChange: (v: T) => void; oculto?: boolean }) {
  return (
    <fieldset className="min-w-0">
      <legend className={cx("mb-1.5 text-sm font-medium", oculto && "sr-only")}>{rotulo}</legend>
      <div className="flex border border-chumbo/45 bg-vidro p-0.5">
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          const I = o.icone;
          return (
            <label key={o.valor} className={cx("relative flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 text-center text-sm font-medium transition-colors", ativo ? "bg-chumbo text-vidro" : "text-chumbo-2 hover:bg-vidro-2 hover:text-chumbo")}>
              <input type="radio" className="sr-only" checked={ativo} onChange={() => onChange(o.valor)} />
              {I && <I size={15} aria-hidden />}
              {o.rotulo}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Alternador({ rotulo, descricao, ligado, onChange }: { rotulo: string; descricao?: string; ligado: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onChange(!ligado)} className="flex w-full items-start gap-3 text-left">
      <span className={cx("mt-0.5 flex h-6 w-10 shrink-0 items-center border p-0.5 transition-colors duration-[var(--movimento-rapido)]", ligado ? "border-chumbo bg-chumbo" : "border-chumbo/45 bg-vidro")}>
        <span className={cx("block size-4 transition-transform duration-[var(--movimento-medio)] ease-[var(--curva)]", ligado ? "translate-x-4 bg-ouro-luz" : "bg-chumbo/45")} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{rotulo}</span>
        {descricao && <span className="block text-[13px] text-chumbo-3">{descricao}</span>}
      </span>
    </button>
  );
}

export function Caixa({ rotulo, marcado, onChange, misto, rotuloVisivel }: { rotulo: string; marcado: boolean; onChange: (v: boolean) => void; misto?: boolean; rotuloVisivel?: boolean }) {
  return (
    <label className="inline-flex min-h-6 cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="peer sr-only" checked={marcado} onChange={(e) => onChange(e.target.checked)} aria-checked={misto ? "mixed" : marcado} />
      <span className={cx("flex size-[18px] shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foco", marcado || misto ? "border-chumbo bg-chumbo text-vidro" : "border-chumbo/55 bg-vidro")}>
        {misto ? <span className="h-0.5 w-2.5 bg-vidro" /> : marcado && <Check size={13} strokeWidth={3} aria-hidden />}
      </span>
      <span className={rotuloVisivel ? undefined : "sr-only"}>{rotulo}</span>
    </label>
  );
}

// ---------------------------------------------------------------- situação

export type Situacao = "ok" | "hoje" | "atencao" | "atrasado" | "rascunho" | "info";
const SIT: Record<Situacao, { icone: LucideIcon; classe: string }> = {
  ok: { icone: CheckCircle2, classe: "bg-ok-vidro text-ok" },
  hoje: { icone: Clock, classe: "bg-atencao-vidro text-atencao" },
  atencao: { icone: AlertTriangle, classe: "bg-atencao-vidro text-atencao" },
  atrasado: { icone: XCircle, classe: "bg-critico-vidro text-critico" },
  rascunho: { icone: CircleDashed, classe: "bg-vidro-2 text-chumbo-2 ring-1 ring-inset ring-filete" },
  info: { icone: Info, classe: "bg-info-vidro text-info" },
};
/** Situação sempre com ícone e palavra: a cor nunca é a única pista. */
export function Selo({ situacao, children }: { situacao: Situacao; children: ReactNode }) {
  const { icone: I, classe } = SIT[situacao];
  return (
    <span className={cx("inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap px-2 text-[12.5px] font-semibold", classe)}>
      <I size={13} aria-hidden strokeWidth={2.4} />
      {children}
    </span>
  );
}

export type Area = "venda" | "financiamento" | "locacao" | "financeiro" | "documentos" | "pessoas";
export const ROTULO_AREA: Record<Area, string> = { venda: "Venda", financiamento: "Financiamento", locacao: "Locação", financeiro: "Financeiro", documentos: "Documentos", pessoas: "Pessoas" };
/** Vidro da área: um quadrado de cor + nome, como a cor de uma linha de metrô. */
export function VidroArea({ area, comNome = true, tamanho = 10 }: { area: Area; comNome?: boolean; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-chumbo-2">
      <span aria-hidden style={{ width: tamanho, height: tamanho, background: `var(--area-${area})` }} className="inline-block shrink-0" />
      {comNome ? ROTULO_AREA[area] : <span className="sr-only">{ROTULO_AREA[area]}</span>}
    </span>
  );
}

export function Chip({ ativo, children, onClick, contagem }: { ativo?: boolean; children: ReactNode; onClick?: () => void; contagem?: number }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={cx("inline-flex h-9 shrink-0 items-center gap-1.5 border px-3 text-sm transition-colors", ativo ? "border-chumbo bg-chumbo text-vidro" : "border-filete bg-vidro text-chumbo-2 hover:border-chumbo/50 hover:text-chumbo")}>
      {children}
      {contagem != null && <span className={cx("num text-xs", ativo ? "text-vidro/80" : "text-chumbo-3")}>{contagem}</span>}
    </button>
  );
}

// ---------------------------------------------------------------- abas

export function Abas<T extends string>({ abas, ativa, onChange, rotulo }: { abas: { valor: T; rotulo: string; contagem?: number }[]; ativa: T; onChange: (v: T) => void; rotulo: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const teclado = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const prox = (i + d + abas.length) % abas.length;
    refs.current[prox]?.focus();
    onChange(abas[prox].valor);
  };
  return (
    <div role="tablist" aria-label={rotulo} className="rolagem flex gap-5 overflow-x-auto border-b border-filete">
      {abas.map((a, i) => {
        const sel = a.valor === ativa;
        return (
          <button key={a.valor} ref={(el) => { refs.current[i] = el; }} role="tab" aria-selected={sel} tabIndex={sel ? 0 : -1} onKeyDown={(e) => teclado(e, i)} onClick={() => onChange(a.valor)}
            className={cx("-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors", sel ? "border-chumbo text-chumbo" : "border-transparent text-chumbo-3 hover:text-chumbo")}>
            {a.rotulo}
            {a.contagem != null && <span className="num text-xs text-chumbo-3">{a.contagem}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- menu

export function Menu({ rotulo, itens, alinhar = "direita", gatilho }: { rotulo: string; itens: { rotulo: string; icone?: LucideIcon; perigo?: boolean; acao: () => void }[]; alinhar?: "esquerda" | "direita"; gatilho: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    requestAnimationFrame(() => botoes.current[0]?.focus());
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  const teclado = (e: React.KeyboardEvent) => {
    const atual = botoes.current.findIndex((b) => b === document.activeElement);
    if (e.key === "Escape") { setAberto(false); (caixa.current?.querySelector("[data-gatilho]") as HTMLElement)?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); botoes.current[(atual + 1) % itens.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); botoes.current[(atual - 1 + itens.length) % itens.length]?.focus(); }
  };
  return (
    <div ref={caixa} className="relative" onKeyDown={teclado}>
      <button type="button" data-gatilho aria-haspopup="menu" aria-expanded={aberto} aria-label={rotulo} onClick={() => setAberto((a) => !a)} className="inline-flex h-9 min-w-9 items-center justify-center gap-1 px-2 text-chumbo-2 hover:bg-vidro-2 hover:text-chumbo">
        {gatilho}
      </button>
      {aberto && (
        <div role="menu" className={cx("anim-surgir absolute z-30 mt-1 min-w-52 border border-chumbo bg-vidro py-1 shadow-[var(--sombra-flutuante)]", alinhar === "direita" ? "right-0" : "left-0")}>
          {itens.map((it, i) => {
            const I = it.icone;
            return (
              <button key={it.rotulo} ref={(el) => { botoes.current[i] = el; }} role="menuitem" onClick={() => { setAberto(false); it.acao(); }}
                className={cx("flex h-10 w-full items-center gap-2.5 px-3 text-left text-sm outline-none hover:bg-vidro-2 focus:bg-vidro-2", it.perigo ? "text-critico" : "text-chumbo")}>
                {I && <I size={15} aria-hidden />}
                {it.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- diálogo e painel lateral

function useEsc(ativo: boolean, fechar: () => void) {
  useEffect(() => {
    if (!ativo) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ativo, fechar]);
}

export function Dialogo({ aberto, titulo, children, acoes, fechar }: { aberto: boolean; titulo: string; children: ReactNode; acoes: ReactNode; fechar: () => void }) {
  useEsc(aberto, fechar);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => { if (aberto) caixa.current?.querySelector<HTMLElement>("button, input")?.focus(); }, [aberto]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-chumbo/40 p-0 @lg:items-center @lg:p-6" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div ref={caixa} role="dialog" aria-modal aria-labelledby="dialogo-titulo" className="anim-subir w-full max-w-md border border-chumbo bg-vidro shadow-[var(--sombra-flutuante)]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-start justify-between gap-4 border-b border-filete px-5 py-4">
          <h2 id="dialogo-titulo" className="text-lg font-semibold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={fechar} className="-mr-2 -mt-1 flex size-9 items-center justify-center text-chumbo-2 hover:bg-vidro-2"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 text-[15px] leading-6 text-chumbo-2">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-filete bg-vidro-2 px-5 py-3 @lg:flex-row @lg:justify-end">{acoes}</div>
      </div>
    </div>
  );
}

/** Detalhe ao lado da lista: abre sem sair da tela. */
export function PainelLateral({ aberto, titulo, subtitulo, children, rodape, fechar }: { aberto: boolean; titulo: string; subtitulo?: ReactNode; children: ReactNode; rodape?: ReactNode; fechar: () => void }) {
  useEsc(aberto, fechar);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-chumbo/25" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <aside role="dialog" aria-modal aria-label={titulo} className="anim-deslizar flex h-full w-full max-w-[460px] flex-col border-l border-chumbo bg-vidro shadow-[var(--sombra-flutuante)]">
        <div className="flex items-start justify-between gap-3 border-b border-filete px-5 py-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{titulo}</h2>
            {subtitulo && <div className="mt-1 text-sm text-chumbo-2">{subtitulo}</div>}
          </div>
          <button type="button" aria-label="Fechar" onClick={fechar} className="-mr-2 flex size-9 shrink-0 items-center justify-center text-chumbo-2 hover:bg-vidro-2"><X size={18} /></button>
        </div>
        <div className="rolagem min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-filete bg-vidro-2 px-5 py-3" style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom, 0px))" }}>{rodape}</div>}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- avisos (toasts)

type Aviso = { id: number; tipo: "ok" | "erro" | "info"; texto: string; desfazer?: () => void };
const CtxAviso = createContext<(a: Omit<Aviso, "id">) => void>(() => {});
export const useAviso = () => useContext(CtxAviso);
export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const remover = useCallback((id: number) => setAvisos((l) => l.filter((a) => a.id !== id)), []);
  const avisar = useCallback((a: Omit<Aviso, "id">) => {
    const id = Date.now() + Math.random();
    setAvisos((l) => [...l.slice(-2), { ...a, id }]);
    setTimeout(() => remover(id), a.desfazer ? 7000 : 4500);
  }, [remover]);
  return (
    <CtxAviso.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}>
        {avisos.map((a) => (
          <div key={a.id} role="status" className="anim-subir pointer-events-auto flex w-full max-w-md items-center gap-3 border border-chumbo bg-chumbo px-4 py-3 text-sm text-vidro shadow-[var(--sombra-flutuante)]">
            {a.tipo === "ok" ? <CheckCircle2 size={18} className="shrink-0 text-ouro-luz" aria-hidden /> : a.tipo === "erro" ? <XCircle size={18} className="shrink-0 text-ouro-luz" aria-hidden /> : <Info size={18} className="shrink-0 text-ouro-luz" aria-hidden />}
            <span className="min-w-0 flex-1">{a.texto}</span>
            {a.desfazer && <button type="button" onClick={() => { a.desfazer?.(); remover(a.id); }} className="shrink-0 font-semibold text-ouro-luz underline-offset-2 hover:underline">Desfazer</button>}
            <button type="button" aria-label="Fechar aviso" onClick={() => remover(a.id)} className="-mr-1 shrink-0 text-vidro/70 hover:text-vidro"><X size={16} /></button>
          </div>
        ))}
      </div>
    </CtxAviso.Provider>
  );
}

// ---------------------------------------------------------------- estados

export function Vazio({ icone: I, titulo, texto, acao }: { icone: LucideIcon; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10 @lg:items-center @lg:text-center">
      <span className="flex size-11 items-center justify-center border border-dashed border-chumbo/40 text-chumbo-3"><I size={20} aria-hidden /></span>
      <div>
        <p className="font-titulo text-[17px] font-semibold">{titulo}</p>
        <p className="mt-1 max-w-[46ch] text-sm text-chumbo-2">{texto}</p>
      </div>
      {acao}
    </div>
  );
}

export function LinhasEsqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <div aria-busy aria-label="Carregando" className="divide-y divide-filete">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <span className="esqueleto size-2.5" />
          <span className="esqueleto h-3.5" style={{ width: `${48 - i * 6}%` }} />
          <span className="esqueleto ml-auto h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function BlocoErro({ titulo, texto, acao }: { titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 border border-critico/60 bg-critico-vidro px-4 py-3">
      <XCircle size={18} className="mt-0.5 shrink-0 text-critico" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-critico">{titulo}</p>
        <p className="mt-0.5 text-sm text-chumbo">{texto}</p>
        {acao && <div className="mt-2">{acao}</div>}
      </div>
    </div>
  );
}

/** Rótulo de seção dentro de um painel (sentence case, sem caixa alta). */
export function TituloPainel({ children, acao, descricao }: { children: ReactNode; acao?: ReactNode; descricao?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 @lg:px-5">
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold leading-tight">{children}</h3>
        {descricao && <p className="mt-1 text-[13px] text-chumbo-3">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Avatar({ nome, tamanho = 28 }: { nome: string; tamanho?: number }) {
  const ini = nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center bg-vidro-2 font-titulo text-[11px] font-bold text-chumbo-2 ring-1 ring-inset ring-filete" style={{ width: tamanho, height: tamanho }}>
      {ini}
    </span>
  );
}
