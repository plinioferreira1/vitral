"use client";

import { useMemo, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { descricaoSugerida, sugestoes, type LancamentoAberto } from "@/lib/financeiro/extrato";
import { conciliarLinha, criarDaLinha, criarEmLote, desfazerLinha, ignorarLinha, transferirDaLinha } from "./actions";

export type LinhaTela = {
  id: string;
  data: string;
  valorCentavos: number;
  descricao: string;
  status: string;
  nota: string | null;
  vinculos: string[];
};

type Opcao = { id: string; nome: string };
type Categoria = Opcao & { tipo: string };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

type Modo = "conciliar" | "criar" | "transferir" | "ignorar";

export function ListaExtrato({
  linhas,
  abertos,
  categorias,
  unidades,
  outrasContas,
  status,
}: {
  linhas: LinhaTela[];
  abertos: LancamentoAberto[];
  categorias: Categoria[];
  unidades: Opcao[];
  outrasContas: Opcao[];
  status: string;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const pendentes = status === "pendente";
  const visiveis = linhas.filter((l) => l.status === status);
  const marcadasValidas = [...marcadas].filter((id) => visiveis.some((l) => l.id === id));

  const porDia = useMemo(() => {
    const grupos: { data: string; itens: LinhaTela[] }[] = [];
    for (const l of visiveis) {
      const ultimo = grupos.at(-1);
      if (ultimo?.data === l.data) ultimo.itens.push(l);
      else grupos.push({ data: l.data, itens: [l] });
    }
    return grupos;
  }, [visiveis]);

  if (!visiveis.length) {
    return (
      <p className={`${CARD_CLASS} p-8 text-center text-sm text-ink-muted`}>
        {pendentes ? "Tudo conciliado nesta conta e período." : "Nenhuma linha nesta situação."}
      </p>
    );
  }

  const alternar = (id: string) =>
    setMarcadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-4">
      {pendentes && (
        <form
          action={async (fd) => {
            await criarEmLote(fd);
            setMarcadas(new Set());
          }}
          className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end`}
        >
          {marcadasValidas.map((id) => (
            <input key={id} type="hidden" name="linha_id" value={id} />
          ))}
          <p className="text-sm text-ink sm:pb-3">
            <span className="num font-semibold">{marcadasValidas.length}</span> marcada(s)
            <button
              type="button"
              onClick={() => setMarcadas(marcadasValidas.length === visiveis.length ? new Set() : new Set(visiveis.map((l) => l.id)))}
              className="ml-2 text-xs font-medium text-brand hover:underline"
            >
              {marcadasValidas.length === visiveis.length ? "desmarcar" : "marcar todas"}
            </button>
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Empresa *</span>
            <select name="unidade_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>Escolha</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Categoria (só nas linhas do mesmo tipo)</span>
            <select name="categoria_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">Sem categoria</option>
              <optgroup label="Despesas">{categorias.filter((c) => c.tipo === "despesa").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
              <optgroup label="Receitas">{categorias.filter((c) => c.tipo === "receita").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
            </select>
          </label>
          <BotaoEnviar disabled={!marcadasValidas.length} className={PRIMARY_BUTTON_CLASS}>
            Criar lançamentos
          </BotaoEnviar>
          <p className="text-xs text-ink-muted sm:col-span-4">
            Para movimentos que ainda não estão no Vitral: cada linha marcada vira um lançamento já pago, com a descrição do banco. Para ligar a um lançamento que já existe, abra a linha.
          </p>
        </form>
      )}

      {porDia.map((g) => (
        <section key={g.data} className={CARD_CLASS}>
          <h3 className="border-b border-border/70 px-4 py-2 text-xs font-semibold capitalize text-ink-muted">{dataLonga(g.data)}</h3>
          <ul className="divide-y divide-border/70">
            {g.itens.map((l) => (
              <li key={l.id}>
                <div className="flex items-start gap-3 px-4 py-3">
                  {pendentes && (
                    <input
                      type="checkbox"
                      aria-label="Marcar linha"
                      checked={marcadas.has(l.id)}
                      onChange={() => alternar(l.id)}
                      className="mt-1 size-5 shrink-0 accent-[var(--color-brand,#7c3aed)]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setAberta(aberta === l.id ? null : l.id)}
                    aria-expanded={aberta === l.id}
                    className="flex min-h-11 min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm text-ink">{descricaoSugerida(l.descricao)}</span>
                      <span className="block text-xs text-ink-muted">
                        {dataBR(l.data)} · {l.descricao.split(":")[0]}
                        {l.vinculos.length > 0 && <> · {l.vinculos.join(", ")}</>}
                        {l.nota && <> · {l.nota}</>}
                      </span>
                    </span>
                    <span className={`num shrink-0 text-sm font-semibold ${l.valorCentavos > 0 ? "text-emerald-700" : "text-ink"}`}>
                      {brl(l.valorCentavos)}
                    </span>
                  </button>
                </div>
                {aberta === l.id && (
                  <div className="border-t border-border/70 bg-background/60 px-4 py-4">
                    {pendentes ? (
                      <Tratar
                        linha={l}
                        abertos={abertos}
                        categorias={categorias}
                        unidades={unidades}
                        outrasContas={outrasContas}
                        aoConcluir={() => setAberta(null)}
                      />
                    ) : (
                      <form action={desfazerLinha} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="linha_id" value={l.id} />
                        <p className="flex-1 text-sm text-ink-muted">
                          {l.status === "ignorado"
                            ? "Esta linha ficou de fora."
                            : "Desfazer apaga a baixa (ou a transferência) gerada por esta linha; se o lançamento foi criado a partir dela, ele também é apagado."}
                        </p>
                        <BotaoComConfirmacao mensagem="Voltar esta linha para 'a conciliar'?" className={SECONDARY_BUTTON_CLASS}>
                          Desfazer
                        </BotaoComConfirmacao>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Tratar({
  linha,
  abertos,
  categorias,
  unidades,
  outrasContas,
  aoConcluir,
}: {
  linha: LinhaTela;
  abertos: LancamentoAberto[];
  categorias: Categoria[];
  unidades: Opcao[];
  outrasContas: Opcao[];
  aoConcluir: () => void;
}) {
  const tipo = linha.valorCentavos > 0 ? "receita" : "despesa";
  const sugeridos = useMemo(() => sugestoes(linha, abertos), [linha, abertos]);
  const [modo, setModo] = useState<Modo>(sugeridos.length ? "conciliar" : "criar");
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set(sugeridos[0]?.exato ? [sugeridos[0].lancamento.id] : []));
  const [busca, setBusca] = useState("");

  const doMesmoTipo = useMemo(() => abertos.filter((a) => a.tipo === tipo), [abertos, tipo]);
  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2) return [];
    return doMesmoTipo
      .filter((a) => `${a.descricao} ${a.pessoa ?? ""} ${(a.saldoCentavos / 100).toFixed(2).replace(".", ",")}`.toLowerCase().includes(t))
      .slice(0, 12);
  }, [busca, doMesmoTipo]);
  const lista = [...sugeridos.map((s) => s.lancamento), ...encontrados.filter((e) => !sugeridos.some((s) => s.lancamento.id === e.id))];
  const soma = [...escolhidos].reduce((s, id) => s + (abertos.find((a) => a.id === id)?.saldoCentavos ?? 0), 0);
  const fecha = soma === Math.abs(linha.valorCentavos);

  const abas: { valor: Modo; rotulo: string }[] = [
    { valor: "conciliar", rotulo: "Ligar a lançamento" },
    { valor: "criar", rotulo: "Criar lançamento" },
    ...(outrasContas.length ? [{ valor: "transferir" as Modo, rotulo: "Transferência entre contas" }] : []),
    { valor: "ignorar", rotulo: "Deixar de fora" },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {abas.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={modo === a.valor}
            onClick={() => setModo(a.valor)}
            className={`min-h-11 shrink-0 rounded-lg px-3.5 text-sm font-medium ${modo === a.valor ? "bg-ink text-surface" : "text-ink-muted hover:bg-surface"}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {modo === "conciliar" && (
        <form action={async (fd) => { await conciliarLinha(fd); aoConcluir(); }} className="space-y-3">
          <input type="hidden" name="linha_id" value={linha.id} />
          {[...escolhidos].map((id) => <input key={id} type="hidden" name="lancamento_id" value={id} />)}
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar ${tipo === "receita" ? "receita" : "despesa"} em aberto por nome ou valor`}
            className={INPUT_CLASS}
          />
          {lista.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {sugeridos.length || busca.trim().length >= 2 ? "Nada encontrado." : "Nenhum lançamento em aberto combina com esta linha. Busque acima ou crie um lançamento."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lista.map((a) => {
                const s = sugeridos.find((x) => x.lancamento.id === a.id);
                return (
                  <li key={a.id}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-surface px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={escolhidos.has(a.id)}
                        onChange={() => setEscolhidos((e) => { const n = new Set(e); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}
                        className="mt-0.5 size-5 shrink-0"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block break-words text-ink">{a.descricao}{a.pessoa ? ` · ${a.pessoa}` : ""}</span>
                        <span className="block text-xs text-ink-muted">
                          Vence {dataBR(a.vencimento)}
                          {s?.exato && " · valor igual"}
                          {s?.nome && " · nome parecido"}
                        </span>
                      </span>
                      <span className="num shrink-0 text-sm font-semibold text-ink">{brl(a.saldoCentavos)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm ${escolhidos.size && !fecha ? "text-amber-700" : "text-ink-muted"}`}>
              Escolhido: <span className="num font-semibold">{brl(soma)}</span> de <span className="num">{brl(Math.abs(linha.valorCentavos))}</span>
              {escolhidos.size > 0 && !fecha && " · a soma precisa bater exatamente"}
            </p>
            <BotaoEnviar disabled={!fecha} className={PRIMARY_BUTTON_CLASS}>Conciliar</BotaoEnviar>
          </div>
        </form>
      )}

      {modo === "criar" && (
        <form action={async (fd) => { await criarDaLinha(fd); aoConcluir(); }} className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <input type="hidden" name="linha_id" value={linha.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Descrição *</span>
            <input name="descricao" required defaultValue={descricaoSugerida(linha.descricao)} className={INPUT_CLASS} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Empresa *</span>
            <select name="unidade_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>Escolha</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Categoria</span>
            <select name="categoria_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">Sem categoria</option>
              {categorias.filter((c) => c.tipo === tipo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Criar {tipo === "receita" ? "receita" : "despesa"} paga</BotaoEnviar>
        </form>
      )}

      {modo === "transferir" && (
        <form action={async (fd) => { await transferirDaLinha(fd); aoConcluir(); }} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="linha_id" value={linha.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">
              {linha.valorCentavos < 0 ? "O dinheiro foi para" : "O dinheiro veio de"} *
            </span>
            <select name="outra_conta_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>Escolha a conta</option>
              {outrasContas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Registrar transferência</BotaoEnviar>
          <p className="text-xs text-ink-muted sm:col-span-2">Ex.: pagamento da fatura do cartão ou aplicação. Não conta como receita nem despesa.</p>
        </form>
      )}

      {modo === "ignorar" && (
        <form action={async (fd) => { await ignorarLinha(fd); aoConcluir(); }} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="linha_id" value={linha.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Motivo *</span>
            <input name="nota" required maxLength={500} placeholder="Ex.: repasse de aluguel, controlado no outro sistema" className={INPUT_CLASS} />
          </label>
          <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Deixar de fora</BotaoEnviar>
        </form>
      )}
    </div>
  );
}
