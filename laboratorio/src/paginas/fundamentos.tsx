import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Info, XCircle, Home, FolderKanban, Wallet, Ruler, FileSignature, Search } from "lucide-react";
import { Botao, cx } from "../ui";

/* Contraste WCAG calculado a partir dos valores reais dos tokens. */
const lum = (hex: string) => {
  const c = hex.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

type Cor = { token: string; nome: string; uso: string; claro: string; escuro: string; texto?: boolean };
const GRUPOS: { titulo: string; descricao: string; cores: Cor[] }[] = [
  { titulo: "Estrutura", descricao: "Cal, vidro e chumbo fazem 90% da tela.", cores: [
    { token: "--cal", nome: "Cal", uso: "Fundo do app", claro: "#f2f1ee", escuro: "#161413" },
    { token: "--vidro", nome: "Vidro", uso: "Painéis", claro: "#ffffff", escuro: "#201d1b" },
    { token: "--chumbo", nome: "Chumbo", uso: "Texto e moldura", claro: "#221e1d", escuro: "#f1ede8", texto: true },
    { token: "--chumbo-2", nome: "Chumbo 2", uso: "Texto secundário", claro: "#59524f", escuro: "#bfb7b0", texto: true },
    { token: "--chumbo-3", nome: "Chumbo 3", uso: "Rótulos discretos", claro: "#7d7571", escuro: "#9a918a", texto: true },
    { token: "--filete", nome: "Filete", uso: "Divisões", claro: "#dcd8d2", escuro: "#3a3431" },
  ] },
  { titulo: "Marca", descricao: "Bordô para agir, dourado como luz. Nunca dourado-claro em texto.", cores: [
    { token: "--bordo", nome: "Bordô", uso: "Ação principal e links", claro: "#7b1e24", escuro: "#e48a8f", texto: true },
    { token: "--ouro", nome: "Ouro", uso: "Texto e ícone dourado", claro: "#8a5d0e", escuro: "#e3b45a", texto: true },
    { token: "--ouro-luz", nome: "Ouro luz", uso: "Preenchimento, destaque", claro: "#e8b84a", escuro: "#c9962f" },
  ] },
  { titulo: "Situação", descricao: "Sempre com ícone e palavra; o fundo claro é o “vidro” da situação.", cores: [
    { token: "--ok", nome: "Em dia", uso: "Concluído, pago", claro: "#2d6e46", escuro: "#7fcf9b", texto: true },
    { token: "--atencao", nome: "Atenção / hoje", uso: "Vence hoje, revisar", claro: "#96530a", escuro: "#f0b25f", texto: true },
    { token: "--critico", nome: "Atrasado", uso: "Vencido, erro", claro: "#b0261c", escuro: "#f2867c", texto: true },
    { token: "--info", nome: "Informação", uso: "Próximos dias, foco", claro: "#2856a3", escuro: "#8fb2f0", texto: true },
  ] },
  { titulo: "Áreas", descricao: "Um vidro por área, sempre o mesmo, em todo o sistema.", cores: [
    { token: "--area-venda", nome: "Venda", uso: "Processos de venda", claro: "#8e2430", escuro: "#e07b86", texto: true },
    { token: "--area-financiamento", nome: "Financiamento", uso: "Bancos e crédito", claro: "#2856a3", escuro: "#7fa6ea", texto: true },
    { token: "--area-locacao", nome: "Locação", uso: "Contratos e débitos", claro: "#0f6e66", escuro: "#5cc2b6", texto: true },
    { token: "--area-financeiro", nome: "Financeiro", uso: "Lançamentos", claro: "#9a6510", escuro: "#e0ad55", texto: true },
    { token: "--area-documentos", nome: "Documentos", uso: "Autorizações, termos", claro: "#5d4893", escuro: "#b7a2ea", texto: true },
    { token: "--area-pessoas", nome: "Pessoas", uso: "DP, férias", claro: "#4a5d2a", escuro: "#a9c27c", texto: true },
  ] },
];

function Razao({ r, texto }: { r: number; texto?: boolean }) {
  const meta = texto ? 4.5 : 3;
  const passa = r >= meta;
  return <span className={cx("num text-[12px] font-semibold", passa ? "text-ok" : "text-chumbo-3")}>{r.toFixed(1).replace(".", ",")}:1{texto ? (passa ? " texto" : "") : passa ? " forma" : " fundo"}</span>;
}

const ESCALA = [
  { nome: "Título de página", classe: "font-titulo text-[30px] font-bold leading-[1.1]", spec: "Gabarito 30/33 · 700 · celular 26" },
  { nome: "Título de painel", classe: "font-titulo text-[17px] font-semibold", spec: "Gabarito 16–17/22 · 600" },
  { nome: "Texto", classe: "text-[15px]", spec: "Archivo 15/22 · 400 · campos 16 no celular" },
  { nome: "Secundário", classe: "text-[13px] text-chumbo-2", spec: "Archivo 13/18 · 400" },
  { nome: "Número de destaque", classe: "num font-titulo text-[34px] font-bold leading-none", spec: "Gabarito 34–40 · 700 · tabular" },
  { nome: "Documento ao cliente", classe: "font-documento text-[19px] leading-[1.6]", spec: "Newsreader 17–19/1,6 · só em documentos" },
];

export function PaginaFundamentos() {
  const [demo, setDemo] = useState(0);
  return (
    <div className="space-y-14">
      <header className="max-w-[72ch]"><h1 className="text-[32px] font-bold leading-tight">Fundamentos</h1><p className="mt-2 text-[17px] text-chumbo-2">Os tokens que todas as telas usam. Os contrastes são calculados sobre o painel (vidro) de cada tema: 4,5:1 para texto e 3:1 para formas, como pede a WCAG 2.2.</p></header>

      <section className="space-y-8">
        <h2 className="text-[24px] font-bold">Cores</h2>
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3"><h3 className="text-[17px] font-semibold">{g.titulo}</h3><p className="text-sm text-chumbo-2">{g.descricao}</p></div>
            <div className="caixilho grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 @6xl:grid-cols-4">
              {g.cores.map((c) => (
                <div key={c.token} className="flex gap-3 p-3">
                  <div className="flex shrink-0 overflow-hidden ring-1 ring-inset ring-filete"><span className="h-14 w-8" style={{ background: c.claro }} title="claro" /><span className="h-14 w-8" style={{ background: c.escuro }} title="escuro" /></div>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{c.nome} <code className="text-[11.5px] font-normal text-chumbo-3">{c.token}</code></p>
                    <p className="text-[13px] text-chumbo-2">{c.uso}</p>
                    <p className="num mt-0.5 text-[12px] text-chumbo-3">{c.claro} / {c.escuro}</p>
                    <p className="flex flex-wrap gap-x-2"><span className="text-[12px] text-chumbo-3">claro</span><Razao r={contraste(c.claro, "#ffffff")} texto={c.texto} /><span className="text-[12px] text-chumbo-3">escuro</span><Razao r={contraste(c.escuro, "#201d1b")} texto={c.texto} /></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-[24px] font-bold">Tipografia</h2>
        <p className="mt-1 max-w-[72ch] text-chumbo-2">Gabarito, da Naipe Foundry (brasileira), dá personalidade aos títulos e números. Archivo, com números tabulares e largura ajustável, segura tabelas densas. Newsreader fica reservada aos documentos que o cliente lê.</p>
        <div className="caixilho mt-4">
          {ESCALA.map((e) => (
            <div key={e.nome} className="grid gap-1 px-4 py-4 @3xl:grid-cols-[200px_minmax(0,1fr)] @3xl:items-baseline @3xl:gap-6">
              <div><p className="text-sm font-medium">{e.nome}</p><p className="text-[12px] text-chumbo-3">{e.spec}</p></div>
              <p className={cx("min-w-0", e.classe)}>{e.nome.startsWith("Número") ? "R$ 31.460.000" : e.nome.startsWith("Documento") ? "Comparamos o seu apartamento com cinco imóveis parecidos na mesma região." : "SQN 312 Bloco K apartamento 504 — Asa Norte"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 @5xl:grid-cols-2">
        <div>
          <h2 className="text-[24px] font-bold">Espaço e densidade</h2>
          <p className="mt-1 text-chumbo-2">Grade de 4 px. Painéis com 16 px de respiro no celular e 20 px no computador. Linhas de lista com 48 px de altura mínima; controles de 44 px.</p>
          <div className="mt-4 space-y-2">
            {[4, 8, 12, 16, 20, 24, 32, 48].map((n) => <div key={n} className="flex items-center gap-3"><span className="num w-10 text-right text-[13px] text-chumbo-3">{n}</span><span className="h-4 bg-ouro-luz" style={{ width: n * 3 }} /></div>)}
          </div>
        </div>
        <div>
          <h2 className="text-[24px] font-bold">Grade e largura</h2>
          <p className="mt-1 text-chumbo-2">No computador a página usa a largura toda (até 1500 px) com uma coluna de apoio de 340–360 px à direita. No celular, uma coluna e barra inferior de cinco destinos.</p>
          <div className="mt-4 grid grid-cols-[1fr_.35fr] gap-px border border-chumbo bg-filete" aria-hidden>
            <div className="h-28 bg-vidro p-2 text-[12px] text-chumbo-3">conteúdo principal · minmax(0, 1fr)</div>
            <div className="h-28 bg-vidro-2 p-2 text-[12px] text-chumbo-3">apoio · 340 px</div>
          </div>
          <div className="mt-3 flex gap-3" aria-hidden><div className="h-28 w-16 border-2 border-chumbo bg-vidro"><div className="m-1 h-3 bg-filete" /><div className="m-1 h-8 bg-vidro-2" /><div className="m-1 h-8 bg-vidro-2" /></div><p className="text-[13px] text-chumbo-2">Celular: tudo empilha na ordem de importância — resposta, ação, detalhe.</p></div>
        </div>
      </section>

      <section className="grid gap-8 @5xl:grid-cols-2">
        <div>
          <h2 className="text-[24px] font-bold">Ícones, bordas e sombra</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-chumbo-2">
            <li><strong className="text-chumbo">Ícones</strong>: traço de 1,9 px (Lucide), 16–20 px, sempre ao lado de texto ou com nome acessível.</li>
            <li><strong className="text-chumbo">Bordas</strong>: filete de 1 px entre painéis; chumbo na moldura de blocos principais. Cantos retos.</li>
            <li><strong className="text-chumbo">Sombra</strong>: só no que flutua sobre a tela (menu, diálogo, aviso). Nunca em painéis.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-4 text-chumbo-2">{[Home, FolderKanban, Wallet, Ruler, FileSignature, Search, CheckCircle2, Clock, AlertTriangle, XCircle, Info].map((I, i) => <I key={i} size={20} strokeWidth={1.9} aria-hidden />)}</div>
        </div>
        <div>
          <h2 className="text-[24px] font-bold">Movimento</h2>
          <p className="mt-1 text-chumbo-2">Curto e só em resposta a uma ação. Desliga com a preferência de movimento reduzido do sistema ou com o botão no topo deste laboratório.</p>
          <div className="mt-4 grid gap-px border border-filete bg-filete text-sm @lg:grid-cols-2">
            {[["Abrir menu ou diálogo", "surgir · 200 ms", "anim-surgir"], ["Painel lateral", "deslizar · 200 ms", "anim-deslizar"], ["Aviso no rodapé", "subir · 200 ms", "anim-subir"], ["Valor que mudou", "acender · 1,4 s", "anim-acender"]].map(([t, s, cl]) => (
              <button key={t} type="button" onClick={() => setDemo((d) => d + 1)} className="bg-vidro p-3 text-left hover:bg-vidro-2">
                <p className="font-medium">{t}</p><p className="text-[12.5px] text-chumbo-3">{s}</p>
                <span key={demo} className={cx("mt-2 block h-6 w-24 bg-chumbo/80", cl, cl === "anim-acender" && "bg-transparent ring-1 ring-filete")} />
              </button>
            ))}
          </div>
          <Botao className="mt-3" tamanho="p" onClick={() => setDemo((d) => d + 1)}>Repetir as animações</Botao>
        </div>
      </section>

      <section className="grid gap-8 @5xl:grid-cols-2">
        <div>
          <h2 className="text-[24px] font-bold">Acessibilidade</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-chumbo-2">
            <li>Foco visível azul de 2 px em tudo que se toca pelo teclado.</li>
            <li>Situação nunca só por cor: ícone e palavra sempre.</li>
            <li>Campos com rótulo visível, ajuda e erro ligados ao campo; 16 px no celular para não dar zoom.</li>
            <li>Menus e abas navegáveis por setas; Esc fecha diálogos e painéis.</li>
            <li>Áreas de toque de pelo menos 44 px.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-[24px] font-bold">Documentos e PDF</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-chumbo-2">
            <li>A4 vertical, margens de 20 mm, cabeçalho com a marca e rodapé com validade e página.</li>
            <li>Newsreader no texto; Archivo em tabelas e rótulos; números tabulares.</li>
            <li>Primeira página responde à pergunta do cliente; anexos técnicos depois.</li>
            <li>Lê bem no celular: uma coluna, corpo de 17 px, nada de tabelas largas.</li>
            <li>Mesma base de cor do sistema, sem fundo colorido (economiza tinta).</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
