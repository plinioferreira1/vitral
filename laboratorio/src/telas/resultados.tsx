import { useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { Casca } from "../casca";
import { RESULTADOS } from "../dados";
import { Avatar, compacto, cx, moeda, numero, Segmentado, TituloPainel, Vazio } from "../ui";

export function TelaResultados() {
  const [ano, setAno] = useState<"2026" | "2025">("2026");
  const r = RESULTADOS;
  const [mes, setMes] = useState<number | null>(null);
  const maxMes = Math.max(...r.porMes.map((m) => m.vgv));
  const escala = Math.ceil(maxMes / 1_000_000) * 1_000_000;
  const pct = r.vgv / r.metaVgv;
  const ritmo = r.metaVgv * (9.4 / 12); // fração do ano até 13/10
  const maxRank = r.ranking[0].vgv;

  return (
    <Casca perfil="gestao" ativo="resultados" usuario="Helena Duarte Vasconcelos" titulo="Resultados">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <header className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight @3xl:text-[30px]">Resultados</h1>
            <p className="text-chumbo-2">Vendas cadastradas e histórico conferido. Só gestores da Sacra veem esta tela.</p>
          </div>
          <div className="w-full max-w-[220px]"><Segmentado rotulo="Ano" oculto valor={ano} onChange={setAno} opcoes={[{ valor: "2025", rotulo: "2025" }, { valor: "2026", rotulo: "2026" }]} /></div>
        </header>

        {ano === "2025" ? (
          <section className="mt-5 border border-chumbo bg-vidro">
            <Vazio icone={BarChart3} titulo="2025 ainda não foi conferido" texto="O histórico de 2025 está sendo conferido com os contratos. Quando terminar, VGV, VGC e ranking aparecem aqui." />
          </section>
        ) : (
          <>
            <div className="caixilho caixilho-forte mt-5 @3xl:grid-cols-2 @5xl:grid-cols-[1.6fr_1fr_1fr]">
              <div className="px-4 py-4 @3xl:col-span-2 @3xl:px-5 @5xl:col-span-1">
                <p className="text-sm text-chumbo-2">VGV de 2026</p>
                <p className="num mt-1 font-titulo text-[34px] font-bold leading-none @3xl:text-[40px]">{moeda(r.vgv)}</p>
                <div className="relative mt-4 h-3 bg-vidro-2 ring-1 ring-inset ring-filete" role="img" aria-label={`${Math.round(pct * 100)}% da meta de ${moeda(r.metaVgv)}`}>
                  <div className="h-full bg-ouro-luz" style={{ width: `${pct * 100}%` }} />
                  <span aria-hidden className="absolute -top-1 h-5 w-0.5 bg-chumbo" style={{ left: `${(ritmo / r.metaVgv) * 100}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px] text-chumbo-2">
                  <span><strong className="num text-chumbo">{Math.round(pct * 100)}%</strong> da meta de {compacto(r.metaVgv)}</span>
                  <span>traço = ritmo esperado para 13/10 ({compacto(ritmo)})</span>
                </div>
              </div>
              <div className="px-4 py-4 @3xl:px-5">
                <p className="text-sm text-chumbo-2">VGC apurado</p>
                <p className="num mt-1 font-titulo text-[28px] font-bold leading-none">{moeda(r.vgc)}</p>
                <p className="mt-2 flex items-start gap-1.5 text-[13px] text-atencao"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />{r.pendencias} vendas com contrato a conferir ficam fora do apurado.</p>
              </div>
              <div className="px-4 py-4 @3xl:px-5">
                <p className="text-sm text-chumbo-2">Vendas</p>
                <p className="num mt-1 font-titulo text-[28px] font-bold leading-none">{r.vendas}</p>
                <p className="mt-2 text-[13px] text-chumbo-2">Ticket médio <span className="num font-medium text-chumbo">{moeda(Math.round(r.vgv / r.vendas / 1000) * 1000)}</span></p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <section className="min-w-0 border border-chumbo bg-vidro">
                <TituloPainel descricao="VGV por mês da data base. Toque numa barra para ver o valor.">VGV por mês</TituloPainel>
                <div className="px-4 pb-4 pt-4 @3xl:px-5">
                  <div className="relative flex h-56 items-end gap-1.5 border-b border-chumbo pl-10 @3xl:gap-3">
                    {[0, 0.5, 1].map((t) => (
                      <div key={t} aria-hidden className="pointer-events-none absolute inset-x-0 flex items-center" style={{ bottom: `${t * 100}%` }}>
                        <span className="num w-9 -translate-y-1/2 text-right text-[11px] text-chumbo-3">{t === 0 ? "0" : `${numero((escala * t) / 1_000_000, t === 0.5 && escala % 2_000_000 ? 1 : 0)} mi`}</span>
                        <span className="ml-1 h-px flex-1 bg-filete" />
                      </div>
                    ))}
                    {r.porMes.map((m, i) => (
                      <button key={m.mes} type="button" onMouseEnter={() => setMes(i)} onMouseLeave={() => setMes(null)} onFocus={() => setMes(i)} onBlur={() => setMes(null)} onClick={() => setMes(mes === i ? null : i)}
                        aria-label={`${m.mes}: ${m.vgv ? moeda(m.vgv) : "sem vendas"}`} className="group relative z-[1] flex h-full flex-1 items-end">
                        <span className={cx("block w-full transition-colors", m.vgv ? (mes === i ? "bg-bordo" : "bg-chumbo/80 group-hover:bg-bordo") : "")} style={{ height: m.vgv ? `${(m.vgv / escala) * 100}%` : 0 }} />
                        {!m.vgv && <span className="absolute inset-x-0 bottom-1 text-center text-[11px] text-chumbo-3">0</span>}
                        {mes === i && (
                          <span className="num absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap border border-chumbo bg-vidro px-2 py-1 text-[12px] font-semibold shadow-[var(--sombra-flutuante)]" style={{ bottom: `${m.vgv ? (m.vgv / escala) * 100 : 0}%` }}>{m.vgv ? compacto(m.vgv) : "Sem vendas"}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-1.5 pl-10 @3xl:gap-3">{r.porMes.map((m) => <span key={m.mes} className="flex-1 text-center text-[12px] text-chumbo-3">{m.mes}</span>)}</div>
                </div>
              </section>

              <section className="min-w-0 border border-chumbo bg-vidro">
                <TituloPainel descricao="Equipe atual. VGV integral para cada participante da venda.">Ranking da equipe</TituloPainel>
                <ol className="divide-y divide-filete border-t border-filete">
                  {r.ranking.map((p, i) => (
                    <li key={p.nome} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 px-4 py-3 @3xl:px-5">
                      <span className={cx("num font-titulo text-[18px] font-bold leading-6", i === 0 ? "text-ouro" : "text-chumbo-3")}>{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex min-w-0 items-start gap-2 font-medium leading-snug"><Avatar nome={p.nome} tamanho={22} /><span>{p.nome}</span></p>
                          <p className="num shrink-0 text-sm font-semibold">{compacto(p.vgv)}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-1.5 flex-1 bg-vidro-2"><span className={cx("block h-full", i === 0 ? "bg-ouro-luz" : "bg-chumbo/70")} style={{ width: `${(p.vgv / maxRank) * 100}%` }} /></span>
                          <span className="num w-16 text-right text-[12.5px] text-chumbo-3">{p.vendas} vendas</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </div>
    </Casca>
  );
}
