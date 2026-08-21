"use client";

import { useState } from "react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { gerarRelatorioSemanalPNG, type ItemRelatorio } from "@/lib/canvas-relatorio-semanal";

export interface DadosRelatorio {
  dataLabel: string;
  totalAtivosVenda: number;
  totalAtivosFinanciamento: number;
  atrasados: ItemRelatorio[];
  vencendo: ItemRelatorio[];
}

function ListaItens({ titulo, cor, itens }: { titulo: string; cor: string; itens: ItemRelatorio[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <p className={`mb-2 text-sm font-semibold ${cor}`}>{titulo}</p>
      <ul className="space-y-2">
        {itens.map((item, i) => (
          <li key={i} className="rounded-lg border border-border/60 bg-surface p-3 text-sm">
            <p className="text-ink">
              <span className="text-xs font-medium text-ink-muted">[{item.categoria}]</span>{" "}
              <span className="font-medium">{item.imovel}</span> — {item.cliente} —{" "}
              {item.etapaAtual}
            </p>
            <p className={`mt-0.5 text-xs font-medium ${cor}`}>{item.prazoTexto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RelatorioSemanal({ dados }: { dados: DadosRelatorio }) {
  const [exportando, setExportando] = useState(false);

  const textoWhatsapp = [
    "📊 *Relatório Semanal — Vendas e Financiamentos*",
    dados.dataLabel,
    "",
    "*Panorama*",
    `▫️ ${dados.totalAtivosVenda} ativos em Vendas`,
    `▫️ ${dados.totalAtivosFinanciamento} ativos em Financiamentos`,
    `▫️ ${dados.atrasados.length} atrasado${dados.atrasados.length !== 1 ? "s" : ""}`,
    `▫️ ${dados.vencendo.length} vencendo essa semana`,
    "",
    ...(dados.atrasados.length > 0
      ? [
          "🔴 *Atrasados*",
          ...dados.atrasados.map(
            (item, i) =>
              `${i + 1}. [${item.categoria}] ${item.imovel} — ${item.cliente} — ${item.etapaAtual} _(${item.prazoTexto})_`
          ),
          "",
        ]
      : []),
    ...(dados.vencendo.length > 0
      ? [
          "🟡 *Vencendo em breve*",
          ...dados.vencendo.map(
            (item, i) =>
              `${i + 1}. [${item.categoria}] ${item.imovel} — ${item.cliente} — ${item.etapaAtual} _(${item.prazoTexto})_`
          ),
        ]
      : []),
    ...(dados.atrasados.length === 0 && dados.vencendo.length === 0
      ? ["Tudo em dia — nenhum atraso ou vencimento próximo. ✅"]
      : []),
  ].join("\n");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Relatório Semanal</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Vendas e Financiamentos em andamento — só o que precisa de atenção.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-ink">Panorama</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xl font-semibold text-ink">{dados.totalAtivosVenda}</p>
            <p className="text-xs text-ink-muted">ativos em Vendas</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-ink">{dados.totalAtivosFinanciamento}</p>
            <p className="text-xs text-ink-muted">ativos em Financiamentos</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-rose-700">{dados.atrasados.length}</p>
            <p className="text-xs text-ink-muted">atrasados</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-amber-700">{dados.vencendo.length}</p>
            <p className="text-xs text-ink-muted">vencendo essa semana</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <BotaoCopiarLink texto={textoWhatsapp} rotulo="Copiar como texto (WhatsApp)" />
        <button
          type="button"
          disabled={exportando}
          onClick={async () => {
            setExportando(true);
            try {
              await gerarRelatorioSemanalPNG(dados);
            } finally {
              setExportando(false);
            }
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background disabled:opacity-60"
        >
          {exportando ? "Gerando..." : "Exportar imagem"}
        </button>
      </div>

      {dados.atrasados.length === 0 && dados.vencendo.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-medium text-emerald-700">
          Tudo em dia — nenhum atraso ou vencimento próximo. ✅
        </p>
      ) : (
        <div className="space-y-6">
          <ListaItens titulo="🔴 Atrasados" cor="text-rose-700" itens={dados.atrasados} />
          <ListaItens titulo="🟡 Vencendo em breve" cor="text-amber-700" itens={dados.vencendo} />
        </div>
      )}
    </div>
  );
}
