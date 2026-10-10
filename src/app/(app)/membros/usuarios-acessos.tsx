"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import {
  CARD_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/styles";
import {
  rotuloNivel,
  type NivelAcesso,
  areasDoUsuario,
  NIVEIS,
  normalizarBusca,
  resumoDP,
} from "@/lib/acessos";
import { type CategoriaProcesso, type PerfilUsuario } from "@/lib/types";
import {
  alterarStatusMembro,
  alterarSenhaMembro,
  cancelarConvite,
  editarEmailMembro,
  editarNomeMembro,
  redefinirSenhaMembro,
  renovarConvite,
} from "./actions";
import { vincularUsuarioColaborador } from "../dp/actions";
import { FormularioAcesso } from "./formularios";

type Membro = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  nivel_acesso: NivelAcesso;
  ativo: boolean;
  categorias: CategoriaProcesso[];
};
type Colaborador = {
  id: string;
  nome: string;
  usuario_id: string | null;
  gestor_id: string | null;
  cargo: string | null;
  departamento: string | null;
};
type Convite = {
  id: string;
  email: string;
  perfil: PerfilUsuario;
  nivel_acesso: NivelAcesso;
  criado_em: string;
  expira_em: string;
  categorias: CategoriaProcesso[];
  url: string;
};
type Aba = "todos" | "ativos" | "convites" | "inativos";
type Painel = "acesso" | "identidade" | "colaborador" | "senha";

function Modal({
  titulo,
  children,
  abrir,
  fechar,
}: {
  titulo: string;
  children: ReactNode;
  abrir: React.RefObject<HTMLDialogElement | null>;
  fechar: () => void;
}) {
  const id = useId();
  return (
    <dialog
      ref={abrir}
      aria-labelledby={id}
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(96vw,680px)] overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-2xl backdrop:bg-black/45"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <h2 id={id} className="text-lg font-semibold text-ink">
          {titulo}
        </h2>
        <button
          type="button"
          aria-label="Fechar janela"
          onClick={fechar}
          className="rounded-lg p-2 text-ink-muted hover:bg-background"
        >
          <X size={20} />
        </button>
      </div>
      <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-5 sm:p-6">
        {children}
      </div>
    </dialog>
  );
}

function Identidade({ m }: { m: Membro }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
      >
        {m.nome
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
          .toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-ink">{m.nome}</p>
        <p className="break-all text-xs text-ink-muted">{m.email}</p>
      </div>
    </div>
  );
}

function Status({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${ativo ? "bg-emerald-50 text-emerald-700" : "bg-background text-ink-muted"}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${ativo ? "bg-emerald-500" : "bg-ink-muted"}`}
      />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

export function UsuariosAcessos({
  membros,
  colaboradores,
  convites,
  meuId,
  agora,
}: {
  membros: Membro[];
  colaboradores: Colaborador[];
  convites: Convite[];
  meuId: string;
  agora: string;
}) {
  const [aba, setAba] = useState<Aba>("todos");
  const [busca, setBusca] = useState("");
  const [nivel, setNivel] = useState("");
  const [area, setArea] = useState("");
  const [vinculo, setVinculo] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [painel, setPainel] = useState<Painel>("acesso");
  const conviteRef = useRef<HTMLDialogElement>(null);
  const detalheRef = useRef<HTMLDialogElement>(null);
  const fichas = new Map(
    colaboradores.filter((c) => c.usuario_id).map((c) => [c.usuario_id, c]),
  );
  const m = membros.find((membro) => membro.id === selecionado);
  const ficha = m ? fichas.get(m.id) : undefined;
  const q = normalizarBusca(busca);
  const bateBusca = (nome: string, email: string) =>
    !q || normalizarBusca(`${nome} ${email}`).includes(q);
  const bateArea = (n: NivelAcesso, cs: CategoriaProcesso[]) =>
    !area || areasDoUsuario(n, cs).includes(area);
  const lista = membros.filter(
    (p) =>
      bateBusca(p.nome, p.email) &&
      (!nivel || p.nivel_acesso === nivel) &&
      bateArea(p.nivel_acesso, p.categorias) &&
      (!vinculo ||
        (vinculo === "com" ? fichas.has(p.id) : !fichas.has(p.id))) &&
      (aba === "todos" ||
        (aba === "ativos" ? p.ativo : aba === "inativos" ? !p.ativo : false)),
  );
  const convitesLista =
    (aba === "todos" || aba === "convites") && vinculo !== "com"
      ? convites.filter(
          (c) =>
            bateBusca("", c.email) &&
            (!nivel || c.nivel_acesso === nivel) &&
            bateArea(c.nivel_acesso, c.categorias),
        )
      : [];
  const areas = Array.from(
    new Set(
      membros
        .flatMap((p) => areasDoUsuario(p.nivel_acesso, p.categorias))
        .concat(
          convites.flatMap((c) => areasDoUsuario(c.nivel_acesso, c.categorias)),
        ),
    ),
  ).sort();
  const abrir = (id: string, p: Painel) => {
    setSelecionado(id);
    setPainel(p);
    detalheRef.current?.showModal();
  };
  const limpar = () => {
    setBusca("");
    setNivel("");
    setArea("");
    setVinculo("");
    setAba("todos");
  };
  const menu = (p: Membro) => (
    <details className="relative">
      <summary
        aria-label={`Ações de ${p.nome}`}
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-ink-muted hover:bg-background"
      >
        <MoreHorizontal size={20} />
      </summary>
      <div className="absolute right-0 z-20 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
        {(
          [
            ["acesso", "Ver e editar acesso"],
            ["identidade", "Editar nome e e-mail"],
            ["colaborador", "Vincular colaborador"],
            ["senha", "Redefinir senha"],
          ] as const
        ).map(([pnl, label]) => (
          <button
            key={pnl}
            type="button"
            onClick={(e) => {
              e.currentTarget.closest("details")?.removeAttribute("open");
              abrir(p.id, pnl);
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-background"
          >
            {label}
          </button>
        ))}
        <div className="my-1 border-t border-border" />
        <form action={alterarStatusMembro}>
          <input type="hidden" name="usuario_id" value={p.id} />
          <input type="hidden" name="ativo" value={String(!p.ativo)} />
          <BotaoComConfirmacao
            disabled={p.id === meuId && p.ativo}
            mensagem={
              p.ativo
                ? `Desativar o acesso de ${p.nome}? O histórico será preservado.`
                : `Reativar o acesso de ${p.nome}?`
            }
            textoEnviando={p.ativo ? "Desativando..." : "Reativando..."}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${p.ativo ? "text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`}
            title={
              p.id === meuId && p.ativo
                ? "Você não pode desativar seu próprio acesso"
                : undefined
            }
          >
            {p.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
            {p.ativo ? "Desativar acesso" : "Reativar acesso"}
          </BotaoComConfirmacao>
        </form>
      </div>
    </details>
  );
  const resumoAreas = (p: Membro) => {
    const a = areasDoUsuario(p.nivel_acesso, p.categorias);
    return (
      <span title={a.join(" · ")} className="text-xs leading-5 text-ink-muted">
        {a.slice(0, 2).join(" · ")}
        {a.length > 2 ? ` · +${a.length - 2}` : ""}
      </span>
    );
  };
  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">
            Configurações
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            Usuários e Acessos
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Gerencie quem acessa o Vitral e quais áreas cada pessoa pode
            utilizar.
          </p>
        </div>
        <button
          type="button"
          className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
          onClick={() => conviteRef.current?.showModal()}
        >
          <Plus size={17} />
          Convidar usuário
        </button>
      </header>
      <div
        className={`${CARD_CLASS} grid grid-cols-2 divide-border sm:grid-cols-4`}
      >
        {[
          ["Usuários ativos", membros.filter((p) => p.ativo).length],
          [
            "Convites pendentes",
            convites.filter((c) => c.expira_em > agora).length,
          ],
          [
            "Acessos administrativos",
            membros.filter(
              (p) => p.ativo && ["diretor", "gerente"].includes(p.nivel_acesso),
            ).length,
          ],
          [
            "Sem colaborador vinculado",
            membros.filter((p) => !fichas.has(p.id)).length,
          ],
        ].map(([label, n]) => (
          <div key={label} className="px-4 py-4 sm:px-5">
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {n}
            </p>
          </div>
        ))}
      </div>
      <section
        className={`${CARD_CLASS} pb-3`}
        aria-label="Usuários e convites"
      >
        <div
          className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2"
          aria-label="Situação dos acessos"
        >
          {(
            [
              ["todos", "Todos"],
              ["ativos", "Ativos"],
              ["convites", "Convites"],
              ["inativos", "Inativos"],
            ] as const
          ).map(([valor, label]) => (
            <button
              type="button"
              key={valor}
              aria-pressed={aba === valor}
              onClick={() => setAba(valor)}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${aba === valor ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="relative">
            <span className="sr-only">Buscar nome ou e-mail</span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome ou e-mail"
              className={`${INPUT_CLASS} pl-9`}
            />
          </label>
          <select
            aria-label="Filtrar perfil de acesso"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Todos os perfis</option>
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {rotuloNivel(n)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar área de acesso"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Todas as áreas</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar vínculo com colaborador"
            value={vinculo}
            onChange={(e) => setVinculo(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Todos os vínculos</option>
            <option value="com">Com colaborador</option>
            <option value="sem">Sem colaborador</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <p role="status" className="text-xs text-ink-muted">
            {lista.length + convitesLista.length} resultado(s)
          </p>
          {(busca || nivel || area || vinculo || aba !== "todos") && (
            <button
              type="button"
              onClick={limpar}
              className="text-xs font-medium text-brand"
            >
              Limpar filtros
            </button>
          )}
        </div>
        {lista.length > 0 && (
          <>
            <table className="hidden w-full table-fixed text-left lg:table">
              <caption className="sr-only">
                Usuários do Vitral e seus acessos
              </caption>
              <thead className="border-y border-border bg-background/60 text-xs text-ink-muted">
                <tr>
                  <th className="w-[30%] px-4 py-3 font-medium">Usuário</th>
                  <th className="w-[22%] px-3 py-3 font-medium">Colaborador</th>
                  <th className="w-[28%] px-3 py-3 font-medium">
                    Perfil e áreas
                  </th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-16">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((p) => (
                  <tr key={p.id} className="hover:bg-background/40">
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => abrir(p.id, "acesso")}
                        className="w-full text-left"
                      >
                        <Identidade m={p} />
                      </button>
                    </td>
                    <td className="px-3 py-4 text-xs text-ink-muted">
                      {fichas.has(p.id) ? (
                        <Link
                          href={`/dp/colaboradores/${fichas.get(p.id)!.id}`}
                          className="text-brand hover:underline"
                        >
                          {fichas.get(p.id)!.nome}
                          <ArrowUpRight size={12} className="ml-1 inline" />
                        </Link>
                      ) : (
                        "Não vinculado"
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <p className="mb-1 text-sm text-ink">
                        {rotuloNivel(p.nivel_acesso)}
                      </p>
                      {resumoAreas(p)}
                    </td>
                    <td className="px-3 py-4">
                      <Status ativo={p.ativo} />
                    </td>
                    <td className="py-4">{menu(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-border lg:hidden">
              {lista.map((p) => (
                <li key={p.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => abrir(p.id, "acesso")}
                      className="min-w-0 text-left"
                    >
                      <Identidade m={p} />
                    </button>
                    {menu(p)}
                  </div>
                  <div className="ml-[52px] mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">
                      {rotuloNivel(p.nivel_acesso)}
                    </span>
                    <Status ativo={p.ativo} />
                  </div>
                  <p className="ml-[52px] mt-1">{resumoAreas(p)}</p>
                  <p className="ml-[52px] mt-1 text-xs text-ink-muted">
                    {fichas.get(p.id)?.nome ?? "Sem colaborador vinculado"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
        {convitesLista.length > 0 && (
          <div className="border-t border-border">
            <p className="px-4 pt-4 text-xs font-semibold text-ink-muted">
              Convites
            </p>
            <ul className="divide-y divide-border">
              {convitesLista.map((c) => {
                const expirado = c.expira_em <= agora;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium">{c.email}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {rotuloNivel(c.nivel_acesso)} ·{" "}
                        <span
                          className={
                            expirado ? "text-amber-700" : "text-ink-muted"
                          }
                        >
                          {expirado ? "Expirado" : "Convite pendente"}
                        </span>{" "}
                        · {expirado ? "Expirou" : "Válido até"}{" "}
                        {new Date(c.expira_em).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!expirado && <BotaoCopiarLink url={c.url} />}
                      <form action={renovarConvite}>
                        <input type="hidden" name="id" value={c.id} />
                        <BotaoEnviar className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted">
                          Renovar link
                        </BotaoEnviar>
                      </form>
                      <form action={cancelarConvite}>
                        <input type="hidden" name="id" value={c.id} />
                        <BotaoComConfirmacao
                          mensagem={`Cancelar o convite para ${c.email}?`}
                          className="rounded-lg px-3 py-2 text-xs text-ink-muted hover:text-rose-700"
                        >
                          Cancelar
                        </BotaoComConfirmacao>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {lista.length + convitesLista.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Users size={28} className="mx-auto mb-3 text-ink-muted/60" />
            <p className="text-sm font-medium">
              Nenhum usuário ou convite encontrado
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Ajuste os filtros ou convide alguém para o Vitral.
            </p>
          </div>
        )}
      </section>
      <Modal
        abrir={conviteRef}
        fechar={() => conviteRef.current?.close()}
        titulo="Convidar usuário"
      >
        <FormularioAcesso
          aoSalvar={() => {
            conviteRef.current?.close();
            setAba("convites");
          }}
        />
      </Modal>
      <Modal
        abrir={detalheRef}
        fechar={() => detalheRef.current?.close()}
        titulo={m?.nome ?? "Detalhes do usuário"}
      >
        {m && (
          <div
            key={`${m.id}-${m.nome}-${m.email}-${m.nivel_acesso}-${m.categorias.join()}-${ficha?.id}`}
            className="space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <Identidade m={m} />
              <Status ativo={m.ativo} />
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-background p-1 sm:grid-cols-4">
              {(
                [
                  ["acesso", "Acesso"],
                  ["identidade", "Identidade"],
                  ["colaborador", "Colaborador"],
                  ["senha", "Senha"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={painel === v}
                  onClick={() => setPainel(v)}
                  className={`rounded-md px-2 py-2 text-xs font-medium ${painel === v ? "bg-surface text-brand shadow-sm" : "text-ink-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {painel === "acesso" && (
              <>
                <section className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold">Departamento Pessoal</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {resumoDP(
                      m.nivel_acesso,
                      !!ficha,
                      colaboradores.filter((c) => c.gestor_id === ficha?.id)
                        .length,
                    )}
                  </p>
                  {ficha && (
                    <Link
                      href={`/dp/colaboradores/${ficha.id}`}
                      className="mt-2 inline-block text-xs font-medium text-brand"
                    >
                      Ver ficha do colaborador →
                    </Link>
                  )}
                </section>
                <FormularioAcesso
                  usuarioId={m.id}
                  nivelInicial={m.nivel_acesso}
                  categoriasIniciais={m.categorias}
                  aoSalvar={() => detalheRef.current?.close()}
                />
                {m.id === meuId && (
                  <p className="text-xs text-ink-muted">
                    Seu próprio acesso administrativo está protegido contra
                    remoção acidental.
                  </p>
                )}
              </>
            )}
            {painel === "identidade" && (
              <div className="space-y-5">
                <FormAcao
                  action={editarNomeMembro}
                  aoSalvar={() => detalheRef.current?.close()}
                  className="space-y-3"
                >
                  <input type="hidden" name="usuario_id" value={m.id} />
                  <label className="block text-xs font-medium text-ink-muted">
                    Nome da conta
                    <input
                      name="novo_nome"
                      required
                      defaultValue={m.nome}
                      className={`${INPUT_CLASS} mt-2`}
                    />
                  </label>
                  <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>
                    Salvar nome
                  </BotaoEnviar>
                </FormAcao>
                <FormAcao
                  action={editarEmailMembro}
                  aoSalvar={() => detalheRef.current?.close()}
                  className="space-y-3"
                >
                  <input type="hidden" name="usuario_id" value={m.id} />
                  <label className="block text-xs font-medium text-ink-muted">
                    E-mail de login
                    <input
                      name="novo_email"
                      type="email"
                      required
                      defaultValue={m.email}
                      className={`${INPUT_CLASS} mt-2`}
                    />
                  </label>
                  <p className="text-xs text-ink-muted">
                    Essa alteração muda o e-mail usado para entrar no Vitral.
                  </p>
                  <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>
                    Salvar e-mail
                  </BotaoEnviar>
                </FormAcao>
              </div>
            )}
            {painel === "colaborador" && (
              <div className="space-y-4">
                {ficha ? (
                  <>
                    <p className="text-sm">
                      Vinculado a <b>{ficha.nome}</b>
                    </p>
                    <p className="text-xs text-ink-muted">
                      {[ficha.cargo, ficha.departamento]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <Link
                      href={`/dp/colaboradores/${ficha.id}`}
                      className={SECONDARY_BUTTON_CLASS}
                    >
                      Ver ficha no DP <ArrowUpRight size={15} />
                    </Link>
                    <p className="text-xs text-ink-muted">
                      Para alterar um vínculo existente, use a ficha do
                      Departamento Pessoal.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink-muted">
                      Vincule uma ficha existente para reunir férias, ponto e
                      documentos da pessoa.
                    </p>
                    <VincularColaborador
                      aoSalvar={() => detalheRef.current?.close()}
                      usuarioId={m.id}
                      colaboradores={colaboradores.filter((c) => !c.usuario_id)}
                    />
                    <Link
                      href="/dp/colaboradores/novo"
                      className="inline-block text-sm font-medium text-brand"
                    >
                      Criar ficha de colaborador →
                    </Link>
                  </>
                )}
              </div>
            )}
            {painel === "senha" && (
              <div className="space-y-4">
                <p className="text-sm text-ink-muted">
                  Envie um link para a pessoa escolher uma nova senha.
                </p>
                <FormAcao
                  action={redefinirSenhaMembro}
                  aoSalvar={() => detalheRef.current?.close()}
                >
                  <input type="hidden" name="usuario_id" value={m.id} />
                  <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>
                    Enviar link de redefinição
                  </BotaoEnviar>
                </FormAcao>
                <details className="border-t border-border pt-4">
                  <summary className="cursor-pointer text-xs text-ink-muted">
                    Definir senha manualmente
                  </summary>
                  <FormAcao
                    action={alterarSenhaMembro}
                    aoSalvar={() => detalheRef.current?.close()}
                    className="mt-3 space-y-3"
                  >
                    <input type="hidden" name="usuario_id" value={m.id} />
                    <label className="block text-xs text-ink-muted">
                      Nova senha
                      <input
                        name="nova_senha"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className={`${INPUT_CLASS} mt-2`}
                      />
                    </label>
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>
                      Salvar senha
                    </BotaoEnviar>
                  </FormAcao>
                </details>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function VincularColaborador({
  usuarioId,
  colaboradores,
  aoSalvar,
}: {
  usuarioId: string;
  colaboradores: Colaborador[];
  aoSalvar: () => void;
}) {
  const [q, setQ] = useState("");
  const [id, setId] = useState("");
  const opcoes = colaboradores.filter((c) =>
    normalizarBusca(c.nome).includes(normalizarBusca(q)),
  );
  return (
    <FormAcao
      action={vincularUsuarioColaborador}
      aoSalvar={aoSalvar}
      className="space-y-3"
    >
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <label className="block text-xs font-medium text-ink-muted">
        Pesquisar colaborador
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setId("");
          }}
          placeholder="Digite o nome"
          className={`${INPUT_CLASS} mt-2`}
        />
      </label>
      <label className="block text-xs font-medium text-ink-muted">
        Ficha sem usuário vinculado
        <select
          name="colaborador_id"
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          className={`${INPUT_CLASS} mt-2`}
        >
          <option value="">Selecione uma ficha</option>
          {opcoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.departamento ? ` · ${c.departamento}` : ""}
            </option>
          ))}
        </select>
      </label>
      {opcoes.length === 0 && (
        <p className="text-xs text-ink-muted">
          Nenhuma ficha disponível com essa busca.
        </p>
      )}
      <BotaoEnviar disabled={!id} className={PRIMARY_BUTTON_CLASS}>
        Vincular colaborador
      </BotaoEnviar>
    </FormAcao>
  );
}

/** O diálogo fecha só após sucesso, para que o aviso do app fique visível. */
function FormAcao({
  action,
  aoSalvar,
  children,
  className,
}: {
  action: (dados: FormData) => Promise<boolean | void>;
  aoSalvar: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  return (
    <form
      className={className}
      action={async (dados) => {
        setFalhou(false);
        const ok = await action(dados);
        if (ok) aoSalvar();
        else setFalhou(true);
      }}
    >
      {falhou && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          Não foi possível concluir. Confira os dados e tente novamente.
        </p>
      )}
      {children}
    </form>
  );
}
