"use client";

import { useState } from "react";
import {
  brl,
  calcularInfoDias,
  formatarEntradaBR,
  parseBR,
  anoBissexto,
  parseDataISO,
  type TipoDivisor,
} from "@/lib/proporcionalidade";

// ---------------------------------------------------------
// Configuração dos grupos (fiel à calculadora original)
// ---------------------------------------------------------

interface ItemConfig {
  key: string;
  label: string;
}

interface GrupoConfig {
  id: string;
  label: string;
  descricao: string;
  divisor: TipoDivisor;
  temBissexto: boolean;
  items: ItemConfig[];
}

const GRUPOS_VENDA: GrupoConfig[] = [
  {
    id: "iptu",
    label: "IPTU / TLP",
    descricao: "Valor anual · rateado dia a dia sobre o ano inteiro (365 ou 366 dias)",
    divisor: "annual",
    temBissexto: true,
    items: [{ key: "iptu", label: "IPTU / TLP" }],
  },
  {
    id: "contas",
    label: "Condomínio, Luz e Água",
    descricao: "Valor mensal · rateado dia a dia sobre os dias do mês",
    divisor: "monthDays",
    temBissexto: false,
    items: [
      { key: "cond", label: "Condomínio" },
      { key: "luz", label: "Luz" },
      { key: "agua", label: "Água" },
    ],
  },
];

const GRUPOS_LOCACAO: GrupoConfig[] = [
  {
    id: "aluguel",
    label: "Aluguel",
    descricao: "Valor mensal · rateado dia a dia · divisor fixo de 30 dias",
    divisor: "fixed30",
    temBissexto: false,
    items: [{ key: "aluguel", label: "Aluguel" }],
  },
  {
    id: "contas",
    label: "Condomínio, Luz e Água",
    descricao: "Valor mensal · rateado dia a dia sobre os dias do mês",
    divisor: "monthDays",
    temBissexto: false,
    items: [
      { key: "cond", label: "Condomínio" },
      { key: "luz", label: "Luz" },
      { key: "agua", label: "Água" },
    ],
  },
  {
    id: "iptu",
    label: "IPTU / TLP",
    descricao: "Valor anual · rateado dia a dia sobre o ano inteiro (365 ou 366 dias)",
    divisor: "annual",
    temBissexto: true,
    items: [{ key: "iptu", label: "IPTU / TLP" }],
  },
];

// ---------------------------------------------------------
// Estado
// ---------------------------------------------------------

interface EstadoGrupo {
  inicio: string;
  fim: string;
  bissexto: boolean;
}

interface EstadoItem {
  ativo: boolean;
  valor: string;
}

interface ItemPersonalizado {
  id: string;
  nome: string;
  tipo: TipoDivisor | "avulso";
  inicio: string;
  fim: string;
  bissexto: boolean;
  responsavel: "vendedor" | "comprador";
  valor: string;
}

interface LinhaResultado {
  label: string;
  groupLabel: string;
  valor: number;
  parteSeller: number;
  parteBuyer: number;
}

interface Resultado {
  linhas: LinhaResultado[];
  totalGeral: number;
  totalSeller: number;
  totalBuyer: number;
  label1: string;
  label2: string;
}

function estadoGrupoInicial(grupos: GrupoConfig[]): Record<string, EstadoGrupo> {
  const estado: Record<string, EstadoGrupo> = {};
  grupos.forEach((g) => (estado[g.id] = { inicio: "", fim: "", bissexto: false }));
  return estado;
}

function estadoItemInicial(grupos: GrupoConfig[]): Record<string, EstadoItem> {
  const estado: Record<string, EstadoItem> = {};
  grupos.forEach((g) =>
    g.items.forEach((i) => (estado[i.key] = { ativo: g.id !== "contas" || i.key === "cond", valor: "" }))
  );
  return estado;
}

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalculadoraPage() {
  const [aba, setAba] = useState<"venda" | "locacao" | "cartorio">("venda");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">
          {aba === "cartorio" ? "Calculadora de Cartório" : "Calculadora de Proporcionalidade"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {aba === "cartorio"
            ? "Estimativa de ITBI, escritura e registro pra passar pro cliente."
            : "Rateio de IPTU, condomínio, água, luz e aluguel entre as partes, proporcional aos dias do período."}
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
        <button
          onClick={() => setAba("venda")}
          className={`flex-1 rounded-md py-2 text-center font-medium transition ${
            aba === "venda" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
          }`}
        >
          Venda
        </button>
        <button
          onClick={() => setAba("locacao")}
          className={`flex-1 rounded-md py-2 text-center font-medium transition ${
            aba === "locacao" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
          }`}
        >
          Locação
        </button>
        <button
          onClick={() => setAba("cartorio")}
          className={`flex-1 rounded-md py-2 text-center font-medium transition ${
            aba === "cartorio" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
          }`}
        >
          Cartório
        </button>
      </div>

      {aba === "venda" && (
        <PainelCalculo
          key="venda"
          tipo="venda"
          grupos={GRUPOS_VENDA}
          permiteItensPersonalizados
          label1="Vendedor"
          label2="Comprador"
        />
      )}
      {aba === "locacao" && (
        <PainelCalculo
          key="locacao"
          tipo="locacao"
          grupos={GRUPOS_LOCACAO}
          permiteItensPersonalizados={false}
          label1="Proporcional"
          label2="Restante"
        />
      )}
      {aba === "cartorio" && <PainelCartorio key="cartorio" />}
    </div>
  );
}

function PainelCalculo({
  tipo,
  grupos,
  permiteItensPersonalizados,
  label1,
  label2,
}: {
  tipo: "venda" | "locacao";
  grupos: GrupoConfig[];
  permiteItensPersonalizados: boolean;
  label1: string;
  label2: string;
}) {
  const [imovel, setImovel] = useState("");
  const [obs, setObs] = useState("");
  const [estadoGrupos, setEstadoGrupos] = useState<Record<string, EstadoGrupo>>(() =>
    estadoGrupoInicial(grupos)
  );
  const [estadoItens, setEstadoItens] = useState<Record<string, EstadoItem>>(() =>
    estadoItemInicial(grupos)
  );
  const [itensPersonalizados, setItensPersonalizados] = useState<ItemPersonalizado[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const atualizarGrupo = (id: string, campo: keyof EstadoGrupo, valor: string | boolean) => {
    setEstadoGrupos((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  };

  const atualizarItem = (key: string, campo: keyof EstadoItem, valor: string | boolean) => {
    setEstadoItens((prev) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  };

  const adicionarItemPersonalizado = () => {
    setItensPersonalizados((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        nome: "",
        tipo: "fixed30",
        inicio: "",
        fim: "",
        bissexto: false,
        responsavel: "vendedor",
        valor: "",
      },
    ]);
  };

  const atualizarItemPersonalizado = (id: string, campos: Partial<ItemPersonalizado>) => {
    setItensPersonalizados((prev) => prev.map((it) => (it.id === id ? { ...it, ...campos } : it)));
  };

  const removerItemPersonalizado = (id: string) => {
    setItensPersonalizados((prev) => prev.filter((it) => it.id !== id));
  };

  const calcular = () => {
    setErro(null);
    const linhas: LinhaResultado[] = [];
    let totalGeral = 0;
    let totalSeller = 0;
    let totalBuyer = 0;

    for (const grupo of grupos) {
      const algumAtivo = grupo.items.some((item) => {
        const est = estadoItens[item.key];
        const valor = parseBR(est.valor);
        return est.ativo && !isNaN(valor) && valor > 0;
      });
      if (!algumAtivo) continue;

      const eg = estadoGrupos[grupo.id];
      const info = calcularInfoDias(eg.inicio, eg.fim, grupo.divisor, eg.bissexto);
      if (!info) {
        setErro(`Preencha as duas datas do grupo "${grupo.label}" antes de calcular.`);
        return;
      }
      if (info.dias < 0) {
        setErro(`No grupo "${grupo.label}", a data final não pode ser anterior à inicial.`);
        return;
      }

      for (const item of grupo.items) {
        const est = estadoItens[item.key];
        if (!est.ativo) continue;
        const valor = parseBR(est.valor);
        if (isNaN(valor) || valor <= 0) continue;

        const parteSeller = (valor / info.divisor) * info.dias;
        const parteBuyer = valor - parteSeller;
        linhas.push({ label: item.label, groupLabel: grupo.label, valor, parteSeller, parteBuyer });
        totalGeral += valor;
        totalSeller += parteSeller;
        totalBuyer += parteBuyer;
      }
    }

    for (const item of itensPersonalizados) {
      const valor = parseBR(item.valor);
      if (isNaN(valor) || valor <= 0) continue;
      const nome = item.nome.trim() || "Item personalizado";

      if (item.tipo === "avulso") {
        const parteSeller = item.responsavel === "vendedor" ? valor : 0;
        const parteBuyer = item.responsavel === "comprador" ? valor : 0;
        linhas.push({ label: nome, groupLabel: "Item avulso", valor, parteSeller, parteBuyer });
        totalGeral += valor;
        totalSeller += parteSeller;
        totalBuyer += parteBuyer;
      } else {
        const info = calcularInfoDias(item.inicio, item.fim, item.tipo, item.bissexto);
        if (!info) {
          setErro(`Preencha as datas do item personalizado "${nome}" antes de calcular.`);
          return;
        }
        if (info.dias < 0) {
          setErro(`No item "${nome}", a data final não pode ser anterior à inicial.`);
          return;
        }
        const parteSeller = (valor / info.divisor) * info.dias;
        const parteBuyer = valor - parteSeller;
        linhas.push({
          label: nome,
          groupLabel: "Personalizado (rateado)",
          valor,
          parteSeller,
          parteBuyer,
        });
        totalGeral += valor;
        totalSeller += parteSeller;
        totalBuyer += parteBuyer;
      }
    }

    if (linhas.length === 0) {
      setErro("Marque ao menos uma conta, informe um valor maior que zero e preencha as datas.");
      setResultado(null);
      return;
    }

    setResultado({ linhas, totalGeral, totalSeller, totalBuyer, label1, label2 });
    setCopiado(false);
  };

  const copiarResultado = async () => {
    if (!resultado) return;
    let texto = `Cálculo de Proporcionalidade — ${tipo === "venda" ? "Venda" : "Locação"}\n`;
    if (imovel) texto += `Imóvel: ${imovel}\n`;
    if (obs) texto += `Observações: ${obs}\n`;
    texto += `\n`;
    resultado.linhas.forEach((l) => {
      const sufixo = l.label === l.groupLabel ? "" : ` (${l.groupLabel})`;
      if (tipo === "locacao") {
        texto += `${l.label}${sufixo}: total ${brl(l.valor)} · ${resultado.label1} ${brl(l.parteSeller)}\n`;
      } else {
        texto += `${l.label}${sufixo}: total ${brl(l.valor)} · ${resultado.label1} ${brl(l.parteSeller)} · ${resultado.label2} ${brl(l.parteBuyer)}\n`;
      }
    });
    if (tipo === "locacao") {
      texto += `\nTotal: ${brl(resultado.totalGeral)} · ${resultado.label1} ${brl(resultado.totalSeller)}`;
    } else {
      texto += `\nTotal: ${brl(resultado.totalGeral)} · ${resultado.label1} ${brl(resultado.totalSeller)} · ${resultado.label2} ${brl(resultado.totalBuyer)}`;
    }

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert(texto);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Identificação
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Imóvel / Endereço (opcional)
            </label>
            <input
              value={imovel}
              onChange={(e) => setImovel(e.target.value)}
              placeholder="Ex: Rua das Palmeiras, 245 — Apto 302"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Observações (opcional)
            </label>
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.id} className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-ink">{grupo.label}</p>
          <p className="mb-3 text-xs text-ink-muted">{grupo.descricao}</p>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <CampoData
              label="Início do período"
              valor={estadoGrupos[grupo.id].inicio}
              onChange={(v) => atualizarGrupo(grupo.id, "inicio", v)}
            />
            <CampoData
              label="Fim do período"
              valor={estadoGrupos[grupo.id].fim}
              onChange={(v) => {
                atualizarGrupo(grupo.id, "fim", v);
                if (grupo.temBissexto) {
                  const d = parseDataISO(v);
                  if (d) atualizarGrupo(grupo.id, "bissexto", anoBissexto(d.getUTCFullYear()));
                }
              }}
            />
          </div>

          {grupo.temBissexto && (
            <label className="mb-3 flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={estadoGrupos[grupo.id].bissexto}
                onChange={(e) => atualizarGrupo(grupo.id, "bissexto", e.target.checked)}
                className="accent-brand"
              />
              Ano bissexto (366 dias)
            </label>
          )}

          <InfoDiasBox grupo={grupo} estado={estadoGrupos[grupo.id]} />

          <div className="mt-3 space-y-2">
            {grupo.items.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                {grupo.items.length > 1 && (
                  <input
                    type="checkbox"
                    checked={estadoItens[item.key].ativo}
                    onChange={(e) => atualizarItem(item.key, "ativo", e.target.checked)}
                    className="accent-brand"
                  />
                )}
                <span className="w-28 shrink-0 text-sm text-ink">{item.label}</span>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-ink-muted">R$</span>
                  <input
                    inputMode="decimal"
                    value={estadoItens[item.key].valor}
                    disabled={grupo.items.length > 1 && !estadoItens[item.key].ativo}
                    onChange={(e) => atualizarItem(item.key, "valor", e.target.value)}
                    onBlur={(e) => {
                      const n = parseBR(e.target.value);
                      if (!isNaN(n)) atualizarItem(item.key, "valor", formatarEntradaBR(n));
                    }}
                    placeholder="0,00"
                    className="w-32 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-background disabled:text-ink-muted"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {permiteItensPersonalizados && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-ink">Itens personalizados</p>
          <p className="mb-3 text-xs text-ink-muted">
            Taxas extras, móveis, ou qualquer outro valor que precise ser rateado ou atribuído a
            uma das partes.
          </p>

          <div className="space-y-4">
            {itensPersonalizados.map((item) => (
              <ItemPersonalizadoForm
                key={item.id}
                item={item}
                onChange={(campos) => atualizarItemPersonalizado(item.id, campos)}
                onRemover={() => removerItemPersonalizado(item.id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={adicionarItemPersonalizado}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-background"
          >
            + Adicionar item
          </button>
        </div>
      )}

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={calcular}
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Calcular rateio
      </button>

      {resultado && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink">Resultado</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor total</th>
                  <th className="py-2 pr-3 text-right font-medium">{resultado.label1}</th>
                  {tipo === "venda" && (
                    <th className="py-2 text-right font-medium">{resultado.label2}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultado.linhas.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 text-ink">
                      {l.label}
                      {l.label !== l.groupLabel && (
                        <span className="block text-xs text-ink-muted">{l.groupLabel}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-ink">{brl(l.valor)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-brand">
                      {brl(l.parteSeller)}
                    </td>
                    {tipo === "venda" && (
                      <td className="py-2 text-right font-mono text-gold">{brl(l.parteBuyer)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Total geral</p>
              <p className="font-mono text-base font-semibold text-ink">
                {brl(resultado.totalGeral)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{resultado.label1}</p>
              <p className="font-mono text-base font-semibold text-brand">
                {brl(resultado.totalSeller)}
              </p>
            </div>
            {tipo === "venda" && (
              <div>
                <p className="text-xs text-ink-muted">{resultado.label2}</p>
                <p className="font-mono text-base font-semibold text-gold">
                  {brl(resultado.totalBuyer)}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={copiarResultado}
            className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
          >
            {copiado ? "Copiado!" : "Copiar resultado"}
          </button>
        </div>
      )}
    </div>
  );
}

function CampoData({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="date"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={() => onChange(hoje())}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-ink-muted hover:bg-background"
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

function InfoDiasBox({ grupo, estado }: { grupo: GrupoConfig; estado: EstadoGrupo }) {
  const info = calcularInfoDias(estado.inicio, estado.fim, grupo.divisor, estado.bissexto);
  if (!info) return null;

  return (
    <div className="rounded-md bg-background px-3 py-2 text-xs text-ink-muted">
      Dias considerados: <b className="text-ink">{info.dias}</b> · {info.divisorLabel}
      {info.dias > info.divisor && (
        <p className="mt-1 text-rose-700">
          ⚠ Os dias considerados são maiores que o divisor. Confira as datas.
        </p>
      )}
      {info.dias <= 0 && (
        <p className="mt-1 text-rose-700">⚠ O período considerado é zero ou negativo.</p>
      )}
    </div>
  );
}

function ItemPersonalizadoForm({
  item,
  onChange,
  onRemover,
}: {
  item: ItemPersonalizado;
  onChange: (campos: Partial<ItemPersonalizado>) => void;
  onRemover: () => void;
}) {
  const isAvulso = item.tipo === "avulso";

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Nome do item</label>
          <input
            value={item.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            placeholder="Ex: Taxa extra, Móveis, etc."
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="button"
          onClick={onRemover}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-ink-muted hover:bg-background hover:text-rose-600"
        >
          Remover
        </button>
      </div>

      <div className="mb-2">
        <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo de cálculo</label>
        <select
          value={item.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as ItemPersonalizado["tipo"] })}
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
        >
          <option value="fixed30">Rateado — divisor fixo (30 dias)</option>
          <option value="monthDays">Rateado — dias do mês de referência</option>
          <option value="annual">Rateado — ano inteiro (365/366 dias)</option>
          <option value="avulso">Item avulso (sem rateio)</option>
        </select>
      </div>

      {!isAvulso ? (
        <>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <CampoData label="Início" valor={item.inicio} onChange={(v) => onChange({ inicio: v })} />
            <CampoData
              label="Fim"
              valor={item.fim}
              onChange={(v) => {
                onChange({ fim: v });
                if (item.tipo === "annual") {
                  const d = parseDataISO(v);
                  if (d) onChange({ bissexto: anoBissexto(d.getUTCFullYear()) });
                }
              }}
            />
          </div>
          {item.tipo === "annual" && (
            <label className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={item.bissexto}
                onChange={(e) => onChange({ bissexto: e.target.checked })}
                className="accent-brand"
              />
              Ano bissexto (366 dias)
            </label>
          )}
        </>
      ) : (
        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Quem paga</label>
          <select
            value={item.responsavel}
            onChange={(e) => onChange({ responsavel: e.target.value as "vendedor" | "comprador" })}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="vendedor">Vendedor</option>
            <option value="comprador">Comprador</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Valor</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-ink-muted">R$</span>
          <input
            inputMode="decimal"
            value={item.valor}
            onChange={(e) => onChange({ valor: e.target.value })}
            onBlur={(e) => {
              const n = parseBR(e.target.value);
              if (!isNaN(n)) onChange({ valor: formatarEntradaBR(n) });
            }}
            placeholder="0,00"
            className="w-32 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Calculadora de Cartório (Escritura + Registro + ITBI)
// Tabelas de emolumentos fornecidas pela Sacra (faixa fixa,
// não é fórmula progressiva).
// ---------------------------------------------------------

interface FaixaEmolumento {
  ate: number | null; // null = última faixa, sem limite superior
  valor: number;
}

const FAIXAS_ESCRITURA: FaixaEmolumento[] = [
  { ate: 9524.89, valor: 461.27 },
  { ate: 15272.67, valor: 701.11 },
  { ate: 28738.89, valor: 1439.13 },
  { ate: 57477.78, valor: 1937.29 },
  { ate: 85888.21, valor: 2029.55 },
  { ate: 200351.09, valor: 2121.8 },
  { ate: 343224.42, valor: 2306.3 },
  { ate: 858882.16, valor: 2490.81 },
  { ate: 1313777.69, valor: 2675.32 },
  { ate: 1806444.32, valor: 2859.81 },
  { ate: null, valor: 3044.32 },
];

const FAIXAS_REGISTRO: FaixaEmolumento[] = [
  { ate: 32844.44, valor: 701.11 },
  { ate: 82111.11, valor: 885.62 },
  { ate: 164222.21, valor: 1070.12 },
  { ate: 262755.54, valor: 1199.28 },
  { ate: 574777.74, valor: 1383.78 },
  { ate: 870377.72, valor: 1568.29 },
  { ate: 1149555.47, valor: 1752.8 },
  { ate: 1477999.89, valor: 1937.29 },
  { ate: 1970666.52, valor: 2121.8 },
  { ate: null, valor: 2306.3 },
];

function buscarFaixa(valor: number, faixas: FaixaEmolumento[]): number {
  for (const f of faixas) {
    if (f.ate === null || valor <= f.ate) return f.valor;
  }
  return faixas[faixas.length - 1].valor;
}

function PainelCartorio() {
  const [valorTexto, setValorTexto] = useState("");
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [resultado, setResultado] = useState<{
    valor: number;
    itbi: number;
    escritura: number;
    registro: number;
    total: number;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const calcular = () => {
    setErro(null);
    const valor = parseBR(valorTexto);
    if (isNaN(valor) || valor <= 0) {
      setErro("Informe o valor do imóvel/venda antes de calcular.");
      setResultado(null);
      return;
    }

    const aliquotaItbi = tipoImovel === "novo" ? 0.01 : 0.02;
    const itbi = valor * aliquotaItbi;
    const escritura = buscarFaixa(valor, FAIXAS_ESCRITURA);
    const registro = buscarFaixa(valor, FAIXAS_REGISTRO);

    setResultado({ valor, itbi, escritura, registro, total: itbi + escritura + registro });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Valor do imóvel / da venda (R$)
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-ink-muted">R$</span>
              <input
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                onBlur={(e) => {
                  const n = parseBR(e.target.value);
                  if (!isNaN(n)) setValorTexto(formatarEntradaBR(n));
                }}
                placeholder="420.000,00"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo de imóvel</label>
            <select
              value={tipoImovel}
              onChange={(e) => setTipoImovel(e.target.value as "usado" | "novo")}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="usado">Usado (ITBI 2%)</option>
              <option value="novo">Novo (ITBI 1%)</option>
            </select>
          </div>
        </div>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={calcular}
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Calcular
      </button>

      {resultado && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink">Resultado</p>
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between py-2">
              <span className="text-ink">ITBI ({tipoImovel === "novo" ? "1%" : "2%"})</span>
              <span className="font-mono text-ink">{brl(resultado.itbi)}</span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-ink">Escritura (emolumentos + ISSQN)</span>
              <span className="font-mono text-ink">{brl(resultado.escritura)}</span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-ink">Registro (emolumentos + ISSQN)</span>
              <span className="font-mono text-ink">{brl(resultado.registro)}</span>
            </li>
          </ul>
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Total estimado</span>
              <span className="font-mono text-base font-semibold text-brand">
                {brl(resultado.total)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Sobre um imóvel de {brl(resultado.valor)}.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Valores de escritura e registro baseados na tabela de emolumentos do cartório (faixa
        fixa por valor do imóvel, já com ISSQN incluso). ITBI calculado sobre o valor da venda.
      </p>
    </div>
  );
}
