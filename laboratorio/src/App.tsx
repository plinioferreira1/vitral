import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { MarcaVitral } from "./casca";
import { cx, ProvedorAvisos } from "./ui";
import { PaginaVisao } from "./paginas/visao";
import { PaginaDirecoes } from "./paginas/direcoes";
import { PaginaFundamentos } from "./paginas/fundamentos";
import { PaginaComponentes } from "./paginas/componentes";
import { PaginaTelas, TELAS } from "./paginas/telas";
import { PaginaImplementacao } from "./paginas/implementacao";

const SECOES = [
  { id: "visao", rotulo: "Visão" },
  { id: "direcoes", rotulo: "Direções" },
  { id: "fundamentos", rotulo: "Fundamentos" },
  { id: "componentes", rotulo: "Componentes" },
  { id: "telas", rotulo: "Telas" },
  { id: "implementacao", rotulo: "Implementação" },
] as const;
type Secao = (typeof SECOES)[number]["id"];

function lerHash(): { secao: Secao; tela?: string } {
  const h = window.location.hash.replace("#", "");
  if (h.startsWith("telas-")) return { secao: "telas", tela: h.slice(6) };
  return { secao: (SECOES.find((s) => s.id === h)?.id ?? "visao") as Secao };
}

function guardar(chave: string, valor: string) { try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: segue sem lembrar */ } }
function ler(chave: string) { try { return localStorage.getItem(chave); } catch { return null; } }

type Tema = "sistema" | "claro" | "escuro";

export function App() {
  const [rota, setRota] = useState(lerHash);
  const [tema, setTema] = useState<Tema>(() => (ler("lab-tema") as Tema) || "sistema");
  const [semMovimento, setSemMovimento] = useState(() => ler("lab-movimento") === "reduzido");

  useEffect(() => {
    const f = () => { setRota(lerHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") raiz.removeAttribute("data-theme"); else raiz.setAttribute("data-theme", tema === "escuro" ? "dark" : "light");
    guardar("lab-tema", tema);
  }, [tema]);
  useEffect(() => { guardar("lab-movimento", semMovimento ? "reduzido" : "normal"); }, [semMovimento]);

  const telaAtual = rota.tela && TELAS.some((t) => t.id === rota.tela) ? rota.tela : TELAS[0].id;
  const proximoTema: Record<Tema, Tema> = { sistema: "claro", claro: "escuro", escuro: "sistema" };
  const IconeTema = tema === "claro" ? Sun : tema === "escuro" ? Moon : SunMoon;

  return (
    <ProvedorAvisos>
      <div className={cx("@container min-h-screen", semMovimento && "sem-movimento")}>
        <header className="sticky z-20 border-b border-chumbo bg-vidro" style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-6 gap-y-1 px-4 @3xl:px-8">
            <a href="#visao" className="flex h-14 items-center gap-2.5">
              <MarcaVitral />
              <span className="font-titulo text-[17px] font-bold">Laboratório Vitral</span>
              <span className="hidden border border-ouro px-1.5 py-0.5 text-[11px] font-semibold text-ouro @lg:inline">dados fictícios</span>
            </a>
            <nav aria-label="Seções do laboratório" className="rolagem order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-2 @6xl:order-none @6xl:mx-0 @6xl:w-auto @6xl:flex-1 @6xl:p-0">
              {SECOES.map((s) => (
                <a key={s.id} href={s.id === "telas" ? `#telas-${telaAtual}` : `#${s.id}`} aria-current={rota.secao === s.id ? "page" : undefined}
                  className={cx("flex h-10 shrink-0 items-center px-3 text-sm font-medium transition-colors @6xl:h-14", rota.secao === s.id ? "bg-chumbo text-vidro" : "text-chumbo-2 hover:text-chumbo")}>
                  {s.rotulo}
                </a>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setSemMovimento((v) => !v)} aria-pressed={semMovimento} className="hidden h-9 items-center px-2.5 text-[13px] text-chumbo-2 hover:text-chumbo @2xl:flex">
                {semMovimento ? "Movimento reduzido" : "Movimento normal"}
              </button>
              <button type="button" onClick={() => setTema(proximoTema[tema])} className="flex h-9 items-center gap-1.5 px-2.5 text-[13px] text-chumbo-2 hover:text-chumbo" aria-label={`Tema: ${tema}. Trocar`}>
                <IconeTema size={16} aria-hidden /><span className="hidden @lg:inline">{tema === "sistema" ? "Tema do sistema" : tema === "claro" ? "Claro" : "Escuro"}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1560px] px-4 pb-24 pt-8 @3xl:px-8">
          {rota.secao === "visao" && <PaginaVisao />}
          {rota.secao === "direcoes" && <PaginaDirecoes />}
          {rota.secao === "fundamentos" && <PaginaFundamentos />}
          {rota.secao === "componentes" && <PaginaComponentes semMovimento={semMovimento} setSemMovimento={setSemMovimento} />}
          {rota.secao === "telas" && <PaginaTelas tela={telaAtual} />}
          {rota.secao === "implementacao" && <PaginaImplementacao />}
        </div>
      </div>
    </ProvedorAvisos>
  );
}
