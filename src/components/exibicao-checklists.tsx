"use client";

import { useState } from "react";
import { Users, UserCheck, Home, ChevronUp, ChevronDown, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Item {
  id: string;
  texto: string;
}
interface Grupo {
  id: string;
  nome: string;
  observacao: string | null;
  checklist_grupo_itens: Item[];
}
export interface ChecklistExibicao {
  id: string;
  nome: string;
  descricao: string | null;
  checklist_grupos: Grupo[];
}

// Ícone e cor por nome de grupo — cobre os nomes mais comuns
// (Compradores, Vendedores, Imóvel); qualquer outro nome cai no
// ícone neutro.
const ICONE_GRUPO: { termo: string; icon: LucideIcon; cor: string }[] = [
  { termo: "comprador", icon: Users, cor: "bg-rose-100 text-rose-600" },
  { termo: "vendedor", icon: UserCheck, cor: "bg-blue-100 text-blue-600" },
  { termo: "imóvel", icon: Home, cor: "bg-emerald-100 text-emerald-600" },
  { termo: "imovel", icon: Home, cor: "bg-emerald-100 text-emerald-600" },
];

function iconeDoGrupo(nome: string): { icon: LucideIcon; cor: string } {
  const achado = ICONE_GRUPO.find((i) => nome.toLowerCase().includes(i.termo));
  return achado ?? { icon: Users, cor: "bg-stone-100 text-stone-600" };
}

function GrupoChecklist({ grupo }: { grupo: Grupo }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(true);
  const { icon: Icon, cor } = iconeDoGrupo(grupo.nome);

  function alternar(itemId: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(itemId)) novo.delete(itemId);
      else novo.add(itemId);
      return novo;
    });
  }

  const total = grupo.checklist_grupo_itens.length;
  const concluidos = marcados.size;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cor}`}>
            <Icon size={19} strokeWidth={2} />
          </div>
          <div>
            <p className="text-base font-semibold text-ink">{grupo.nome}</p>
            <p className="text-xs text-ink-muted">{total} itens obrigatórios</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs text-ink-muted">
            {concluidos} de {total} itens
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${percentual}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs font-medium text-ink-muted">{percentual}%</span>
          {aberto ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
        </div>
      </button>

      {aberto && (
        <div className="grid gap-x-6 gap-y-1 border-t border-border p-5 sm:grid-cols-2">
          {grupo.checklist_grupo_itens.map((item, i) => {
            const marcado = marcados.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => alternar(item.id)}
                className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm transition hover:bg-background"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border-strong text-[10px] text-ink-muted">
                  {i + 1}
                </span>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    marcado ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                  }`}
                >
                  {marcado && <Check size={11} strokeWidth={3} />}
                </span>
                <span className={marcado ? "text-ink-muted line-through" : "text-ink"}>{item.texto}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExibicaoChecklists({ checklists }: { checklists: ChecklistExibicao[] }) {
  const [selecionadoId, setSelecionadoId] = useState(checklists[0]?.id ?? "");

  if (checklists.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
        Nenhum checklist criado ainda. Configure em Configurações → Checklists de Financiamento.
      </p>
    );
  }

  const selecionado = checklists.find((c) => c.id === selecionadoId) ?? checklists[0];

  return (
    <div className="space-y-6">
      {checklists.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg bg-background p-1 text-sm w-fit">
          {checklists.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionadoId(c.id)}
              className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                selecionado.id === c.id ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {selecionado.descricao && <p className="text-sm text-ink-muted">{selecionado.descricao}</p>}

        {selecionado.checklist_grupos.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
            Esse checklist ainda não tem seções configuradas.
          </p>
        ) : (
          selecionado.checklist_grupos.map((grupo) => (
            <div key={grupo.id}>
              <GrupoChecklist grupo={grupo} />
              {grupo.observacao && <p className="mt-1.5 px-1 text-xs text-ink-muted">{grupo.observacao}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
