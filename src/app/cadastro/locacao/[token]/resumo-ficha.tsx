import { secoesVisiveis, valorExibido, ETAPA_DOCUMENTOS, type DadosFicha, type TipoLocatario } from "@/lib/ficha-locacao/campos";
import type { ItemChecklist } from "@/lib/ficha-locacao/documentos";

export function ResumoFicha({ dados, tipo, checklist, corrigir }: { dados: DadosFicha; tipo: TipoLocatario; checklist: ItemChecklist[]; corrigir: (etapa: number) => void }) {
  return <div className="space-y-4"><div><h2 className="text-xl font-bold">Confira sua ficha</h2><p className="mt-1 text-sm text-stone-500">Revise os dados e documentos antes de declarar e assinar. Corrigir dados exige uma nova assinatura.</p></div>
    {secoesVisiveis(dados, tipo).filter((s) => s.campos.some((c) => valorExibido(c, dados))).map((s) => <section key={s.id} className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{s.titulo}</h3><button type="button" onClick={() => corrigir(s.etapa)} className="text-xs font-semibold text-[#731515]" aria-label={`Corrigir ${s.titulo}`}>Corrigir</button></div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">{s.campos.filter((c) => valorExibido(c, dados)).map((c) => <div key={c.chave} className={c.larga ? "sm:col-span-2" : ""}><dt className="text-xs text-stone-500">{c.rotulo}</dt><dd className="break-words text-sm">{valorExibido(c, dados)}</dd></div>)}</dl>
    </section>)}
    <section className="rounded-xl border border-stone-200 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Documentos</h3><button type="button" onClick={() => corrigir(ETAPA_DOCUMENTOS)} className="text-xs font-semibold text-[#731515]">Conferir documentos</button></div><ul className="mt-3 space-y-2 text-sm">{checklist.filter((i) => i.situacao !== "opcional").map((i) => <li key={i.tipo}>{i.situacao === "anexado" ? "✓" : i.situacao === "nao_aplicavel" ? "—" : "Pendente:"} {i.tipo}{i.justificativa ? `: ${i.justificativa}` : ""}</li>)}</ul></section>
  </div>;
}
