import { CARD_CLASS } from "@/components/ui/styles";
import { DIAS_SEMANA, diaDaSemana, duracao, hhmm, type DiaPonto } from "@/lib/dp/ponto";
import { SituacaoDiaTexto } from "./ui";

type Dia = DiaPonto & { contabiliza: boolean };
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const saldoTexto = (d: Dia) => (d.contabiliza && d.saldo !== 0 ? duracao(d.saldo, true) : "—");
const corSaldo = (n: number) => (n > 0 ? "text-sky-700" : n < 0 ? "text-rose-700" : "text-ink-muted");

/** Espelho de ponto: tabela no computador, cartões no celular. */
export function Espelho({ dias, hoje }: { dias: Dia[]; hoje: string }) {
  return (
    <>
      <div className={`${CARD_CLASS} hidden overflow-x-auto md:block`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {["Data", "Entrada", "Saída intervalo", "Retorno", "Saída", "Previstas", "Trabalhadas", "Saldo", "Situação"].map((c) => (
                <th key={c} className="px-3 py-2.5 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dias.map((d) => (
              <tr key={d.data} className={`${d.data === hoje ? "bg-brand-soft/40" : ""} ${d.data > hoje ? "opacity-50" : ""}`}>
                <td className="num whitespace-nowrap px-3 py-2 text-ink">
                  {dm(d.data)} <span className="text-xs text-ink-muted">{DIAS_SEMANA[diaDaSemana(d.data)]}</span>
                </td>
                {(["entrada", "saida_intervalo", "retorno_intervalo", "saida"] as const).map((t) => (
                  <td key={t} className="num px-3 py-2 text-ink">
                    {hhmm(d.registros[t])}
                  </td>
                ))}
                <td className="num px-3 py-2 text-ink-muted">{d.previstas ? duracao(d.previstas) : "—"}</td>
                <td className="num px-3 py-2 text-ink">{d.trabalhadas ? duracao(d.trabalhadas) : "—"}</td>
                <td className={`num px-3 py-2 font-medium ${corSaldo(d.contabiliza ? d.saldo : 0)}`}>{saldoTexto(d)}</td>
                <td className="px-3 py-2">{d.data > hoje && d.situacao === "sem_registro" ? <span className="text-xs text-ink-muted">—</span> : <SituacaoDiaTexto situacao={d.situacao} detalhe={d.detalhe} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {dias
          .filter((d) => d.data <= hoje)
          .reverse()
          .map((d) => (
            <li key={d.data} className={`${CARD_CLASS} px-4 py-3`}>
              <div className="flex items-center justify-between gap-3">
                <p className="num text-sm font-semibold text-ink">
                  {dm(d.data)} <span className="text-xs font-normal text-ink-muted">{DIAS_SEMANA[diaDaSemana(d.data)]}</span>
                </p>
                <SituacaoDiaTexto situacao={d.situacao} detalhe={d.detalhe} />
              </div>
              {d.registros.entrada !== undefined && (
                <p className="num mt-1.5 text-sm text-ink">
                  {hhmm(d.registros.entrada)} · {hhmm(d.registros.saida_intervalo)} · {hhmm(d.registros.retorno_intervalo)} · {hhmm(d.registros.saida)}
                </p>
              )}
              {(d.previstas > 0 || d.trabalhadas > 0) && (
                <p className="mt-1 text-xs text-ink-muted">
                  Trabalhadas <span className="num text-ink">{duracao(d.trabalhadas)}</span> de <span className="num">{duracao(d.previstas)}</span>
                  {d.contabiliza && d.saldo !== 0 && <span className={`num ml-2 font-semibold ${corSaldo(d.saldo)}`}>{duracao(d.saldo, true)}</span>}
                </p>
              )}
            </li>
          ))}
      </ul>
    </>
  );
}
