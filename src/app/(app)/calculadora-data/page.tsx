"use client";

import { useState, useMemo } from "react";
import { addYears, addMonths, addDays, format, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalculadoraDataPage() {
  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);

  const [dataInicial, setDataInicial] = useState(hojeISO);
  const [operacao, setOperacao] = useState<"somar" | "subtrair">("somar");
  const [dias, setDias] = useState("");
  const [meses, setMeses] = useState("");
  const [anos, setAnos] = useState("");

  const resultado = useMemo(() => {
    if (!dataInicial) return null;

    const nDias = Number(dias) || 0;
    const nMeses = Number(meses) || 0;
    const nAnos = Number(anos) || 0;
    if (nDias === 0 && nMeses === 0 && nAnos === 0) return null;

    const sinal = operacao === "somar" ? 1 : -1;

    // Segue a mesma ordem de qualquer calculadora de data: primeiro os
    // anos, depois os meses, por último os dias — cada etapa já ajusta
    // sozinha pro último dia do mês quando ele não existe (ex: 31 de
    // janeiro + 1 mês vira o último dia de fevereiro).
    const [ano, mes, dia] = dataInicial.split("-").map(Number);
    let data = new Date(ano, mes - 1, dia);
    data = addYears(data, sinal * nAnos);
    data = addMonths(data, sinal * nMeses);
    data = addDays(data, sinal * nDias);

    return data;
  }, [dataInicial, operacao, dias, meses, anos]);

  const campoClasse =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Calculadora de Datas</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Some ou subtraia dias, meses e anos de uma data — pra calcular prazos, vencimentos e
          cronogramas rapidinho.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Data inicial</label>
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            className={campoClasse}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Operação</label>
          <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
            <button
              type="button"
              onClick={() => setOperacao("somar")}
              className={`rounded-md px-4 py-1.5 font-medium transition ${
                operacao === "somar" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              Somar
            </button>
            <button
              type="button"
              onClick={() => setOperacao("subtrair")}
              className={`rounded-md px-4 py-1.5 font-medium transition ${
                operacao === "subtrair" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              Subtrair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Dias</label>
            <input
              type="number"
              min={0}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              placeholder="0"
              className={campoClasse}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Meses</label>
            <input
              type="number"
              min={0}
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
              placeholder="0"
              className={campoClasse}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Anos</label>
            <input
              type="number"
              min={0}
              value={anos}
              onChange={(e) => setAnos(e.target.value)}
              placeholder="0"
              className={campoClasse}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Resultado
        </p>
        {!resultado ? (
          <p className="text-sm text-ink-muted">Informe uma quantidade de dias, meses ou anos.</p>
        ) : (
          <>
            <p className="font-mono text-3xl font-semibold text-ink">
              {format(resultado, "dd/MM/yyyy")}
            </p>
            <div className="mt-3 space-y-1 text-sm text-ink-muted">
              <p>
                Dia da semana:{" "}
                <span className="font-medium text-ink">
                  {format(resultado, "EEEE", { locale: ptBR })}
                </span>
              </p>
              <p>
                Cai em fim de semana:{" "}
                <span className="font-medium text-ink">
                  {isWeekend(resultado) ? "Sim" : "Não"}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
