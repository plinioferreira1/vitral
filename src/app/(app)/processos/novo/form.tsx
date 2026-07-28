"use client";

import { useMemo, useState } from "react";
import { criarProcesso } from "./actions";
import { gerarEtapas } from "@/lib/motor-processos";
import type { ModeloEtapa, CategoriaProcesso } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModeloComEtapas {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: CategoriaProcesso;
  etapas: ModeloEtapa[];
}

interface Props {
  modelos: ModeloComEtapas[];
  clientes: { id: string; nome: string }[];
  imoveis: { id: string; endereco: string }[];
  bancos: { id: string; nome: string }[];
  corretores: { id: string; nome: string }[];
  usuarios: { id: string; nome: string }[];
}

export function NovoProcessoForm({ modelos, clientes, imoveis, bancos, corretores, usuarios }: Props) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [dataBase, setDataBase] = useState(() => new Date().toISOString().slice(0, 10));

  const modeloSelecionado = modelos.find((m) => m.id === modeloId);
  const ehFinanciamento = modeloSelecionado?.categoria === "financiamento";

  const preview = useMemo(() => {
    if (!modeloSelecionado || !dataBase) return [];
    try {
      return gerarEtapas(modeloSelecionado.etapas, parseISO(dataBase));
    } catch {
      return [];
    }
  }, [modeloSelecionado, dataBase]);

  return (
    <form action={criarProcesso} className="space-y-5">
      <input type="hidden" name="categoria" value={modeloSelecionado?.categoria ?? "venda"} />

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Modelo</label>
        <select
          name="modelo_processo_id"
          value={modeloId}
          onChange={(e) => setModeloId(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        {modeloSelecionado?.descricao && (
          <p className="mt-1 text-xs text-ink-muted">{modeloSelecionado.descricao}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={ehFinanciamento ? "Cliente" : "Comprador"}
          name="comprador_id"
          options={clientes.map((c) => [c.id, c.nome])}
        />
        {!ehFinanciamento && (
          <Select label="Vendedor" name="vendedor_id" options={clientes.map((c) => [c.id, c.nome])} />
        )}
        <Select label="Imóvel" name="imovel_id" options={imoveis.map((i) => [i.id, i.endereco])} />
        <Select label="Banco" name="banco_id" options={bancos.map((b) => [b.id, b.nome])} />
        <Select label="Corretor" name="corretor_id" options={corretores.map((c) => [c.id, c.nome])} />
        <Select label="Responsável" name="responsavel_id" options={usuarios.map((u) => [u.id, u.nome])} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            {ehFinanciamento ? "Valor do imóvel (R$)" : "Valor (R$)"}
          </label>
          <input
            name="valor_total"
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="420000.00"
          />
        </div>

        {ehFinanciamento && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor financiado (R$)
              </label>
              <input
                name="valor_financiado"
                type="number"
                step="0.01"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="220000.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Origem</label>
              <input
                name="origem"
                placeholder="Indicação, SACRA, Elevare..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <Select
              label="Indicação"
              name="indicacao_id"
              options={corretores.map((c) => [c.id, c.nome])}
            />
          </>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          Data base (ex: data do contrato)
        </label>
        <input
          name="data_base"
          type="date"
          required
          value={dataBase}
          onChange={(e) => setDataBase(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Prévia das etapas geradas
          </p>
          <ol className="space-y-2">
            {preview.map((e, i) => (
              <li key={e.modelo_etapa_id} className="flex items-center gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-xs text-ink-muted">
                  {i + 1}
                </span>
                <span className="flex-1 text-ink">{e.nome}</span>
                <span className="font-mono text-xs text-ink-muted">
                  {e.data_prevista
                    ? format(parseISO(e.data_prevista), "dd MMM yyyy", { locale: ptBR })
                    : "a definir"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Criar processo
      </button>
    </form>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <select
        name={name}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        defaultValue=""
      >
        <option value="">—</option>
        {options.map(([id, nome]) => (
          <option key={id} value={id}>
            {nome}
          </option>
        ))}
      </select>
    </div>
  );
}
