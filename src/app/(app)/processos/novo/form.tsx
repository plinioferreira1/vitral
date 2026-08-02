"use client";

import { useMemo, useState } from "react";
import { criarProcesso } from "./actions";
import type { CategoriaProcesso } from "@/lib/types";
import { CampoMoeda } from "@/components/campo-moeda";

interface EtapaPadraoBasica {
  id: string;
  nome: string;
  ordem: number;
  categoria: CategoriaProcesso;
  tipo: "sequencial" | "especial";
}

interface ModeloBasico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: CategoriaProcesso;
}

interface Props {
  modelos: ModeloBasico[];
  etapasPadrao: EtapaPadraoBasica[];
  clientes: { id: string; nome: string }[];
  imoveis: { id: string; endereco: string }[];
  corretores: { id: string; nome: string }[];
}

export function NovoProcessoForm({
  modelos,
  etapasPadrao,
  clientes,
  imoveis,
  corretores,
}: Props) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [dataBase, setDataBase] = useState(() => new Date().toISOString().slice(0, 10));
  const [etapasSelecionadas, setEtapasSelecionadas] = useState<Set<string>>(new Set());

  const modeloSelecionado = modelos.find((m) => m.id === modeloId);
  const ehFinanciamento = modeloSelecionado?.categoria === "financiamento";

  const etapasDaCategoria = useMemo(
    () => etapasPadrao.filter((ep) => ep.categoria === modeloSelecionado?.categoria && ep.tipo === "sequencial"),
    [etapasPadrao, modeloSelecionado]
  );

  const alternarEtapa = (id: string) => {
    setEtapasSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  return (
    <form action={criarProcesso} className="space-y-5">
      <input type="hidden" name="categoria" value={modeloSelecionado?.categoria ?? "venda"} />
      {!ehFinanciamento &&
        Array.from(etapasSelecionadas).map((id) => (
          <input key={id} type="hidden" name="etapas_selecionadas" value={id} />
        ))}

      <Datalist id="lista-clientes" options={clientes.map((c) => c.nome)} />
      <Datalist id="lista-imoveis" options={imoveis.map((i) => i.endereco)} />
      <Datalist id="lista-corretores" options={corretores.map((c) => c.nome)} />

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Modelo</label>
        <select
          name="modelo_processo_id"
          value={modeloId}
          onChange={(e) => {
            setModeloId(e.target.value);
            setEtapasSelecionadas(new Set());
          }}
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
        <CampoTexto
          label={ehFinanciamento ? "Cliente" : "Comprador"}
          name="comprador_nome"
          listId="lista-clientes"
          placeholder="Digite ou escolha um nome"
        />
        {!ehFinanciamento && (
          <CampoTexto
            label="Vendedor"
            name="vendedor_nome"
            listId="lista-clientes"
            placeholder="Digite ou escolha um nome"
          />
        )}
        <CampoTexto
          label="Imóvel"
          name="imovel_endereco"
          listId="lista-imoveis"
          placeholder="Endereço do imóvel"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Banco</label>
          <select
            name="banco_nome"
            defaultValue=""
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="">—</option>
            <option value="ITAÚ">ITAÚ</option>
            <option value="BRB">BRB</option>
            <option value="CAIXA">CAIXA</option>
            <option value="SANTANDER">SANTANDER</option>
            <option value="INTER">INTER</option>
            <option value="BANCO DO BRASIL">BANCO DO BRASIL</option>
          </select>
        </div>
        <CampoTexto
          label="Indicação"
          name="corretor_nome"
          listId="lista-corretores"
          placeholder="Quem indicou o cliente"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Responsável</label>
          <select
            name="responsavel_nome"
            defaultValue=""
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="">—</option>
            <option value="Ricardo">Ricardo</option>
            <option value="Jefté">Jefté</option>
            <option value="Plínio">Plínio</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            {ehFinanciamento ? "Valor do imóvel (R$)" : "Valor (R$)"}
          </label>
          <CampoMoeda name="valor_total" placeholder="420.000,00" />
        </div>

        {ehFinanciamento && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor financiado (R$)
              </label>
              <CampoMoeda name="valor_financiado" placeholder="220.000,00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Origem</label>
              <input
                name="origem"
                placeholder="Indicação, SACRA, Elevare..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
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

      {ehFinanciamento ? (
        etapasDaCategoria.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-ink-muted">
              {`As etapas do financiamento seguem um fluxo padrão e serão criadas automaticamente (${etapasDaCategoria.length} etapas, de "${etapasDaCategoria[0]?.nome}" até "${etapasDaCategoria[etapasDaCategoria.length - 1]?.nome}").`}
            </p>
          </div>
        )
      ) : (
        etapasDaCategoria.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Quais etapas fazem parte desse processo?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {etapasDaCategoria.map((ep) => {
                const marcada = etapasSelecionadas.has(ep.id);
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => alternarEtapa(ep.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      marcada
                        ? "border-brand bg-brand/10 font-medium text-brand"
                        : "border-border bg-surface text-ink-muted hover:bg-background"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        marcada ? "border-brand bg-brand text-white" : "border-border-strong"
                      }`}
                    >
                      {marcada && (
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6.5L4.5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {ep.nome}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Sem data automática — depois de criado, ajuste o prazo de cada etapa na tela do
              processo.
            </p>
          </div>
        )
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

function CampoTexto({
  label,
  name,
  listId,
  placeholder,
}: {
  label: string;
  name: string;
  listId: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <input
        name={name}
        list={listId}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

function Datalist({ id, options }: { id: string; options: string[] }) {
  const opcoesUnicas = Array.from(new Set(options));
  return (
    <datalist id={id}>
      {opcoesUnicas.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );
}
