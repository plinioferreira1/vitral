import { createClient } from "@/lib/supabase/server";
import { traduzirErroAuth } from "@/lib/erros-auth";
import {
  atualizarCategoriasMembro,
  editarNomeMembro,
  editarEmailMembro,
  alterarSenhaMembro,
  excluirMembro,
  criarConvite,
  cancelarConvite,
  reenviarRedefinicaoParaTodos,
} from "./actions";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { obterSiteUrl } from "@/lib/site-url";
import { CATEGORIA_LABEL, NIVEL_ACESSO_LABEL, type CategoriaProcesso, type NivelAcesso } from "@/lib/types";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Settings, ShieldCheck, UserRoundCog, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

export const maxDuration = 60;

const PERFIS = [
  ["admin", "Administrador"],
  ["diretora", "Diretora"],
  ["gerente", "Gerente"],
  ["corretor", "Corretor"],
  ["correspondente", "Correspondente"],
  ["financeiro", "Financeiro"],
] as const;

const CATEGORIAS: CategoriaProcesso[] = ["venda", "financiamento", "locacao", "marketing"];
const NIVEIS: NivelAcesso[] = [
  "diretor",
  "gerente",
  "supervisor",
  "auxiliar",
  "corretor",
  "social_media",
];

const FINANCEIRO_NIVEIS: NivelAcesso[] = ["diretor", "gerente"];

function temAcessoFinanceiro(nivel: string): boolean {
  return FINANCEIRO_NIVEIS.includes(nivel as NivelAcesso);
}

function nivelLabel(nivel: string): string {
  return NIVEL_ACESSO_LABEL[nivel as NivelAcesso] ?? nivel;
}

function acessosEfetivos(nivel: string, categorias: Set<CategoriaProcesso>): string[] {
  if (nivel === "social_media") return ["Ferramentas", "Central de ajuda"];
  if (nivel === "corretor") return ["Documentos", "Ferramentas", "Central de ajuda"];

  const acessos = ["Documentos", "Ferramentas", "Central de ajuda"];
  const acessoTotalProcessos = nivel === "diretor" || nivel === "gerente" || nivel === "auxiliar";

  if (acessoTotalProcessos || categorias.has("venda")) acessos.unshift("Vendas");
  if (acessoTotalProcessos || categorias.has("financiamento")) acessos.unshift("Financiamentos");
  if (acessoTotalProcessos || categorias.has("locacao")) acessos.unshift("Locação");
  if (temAcessoFinanceiro(nivel)) acessos.push("Financeiro", "Relatórios", "Configurações");

  return Array.from(new Set(acessos));
}

function descricaoNivel(nivel: string): string {
  if (nivel === "diretor") return "Acesso total, incluindo Financeiro e Configurações.";
  if (nivel === "gerente") return "Acesso total, incluindo Financeiro e Configurações.";
  if (nivel === "auxiliar") return "Vê as áreas operacionais, sem Financeiro e Configurações.";
  if (nivel === "supervisor") return "Acessa somente as categorias marcadas.";
  if (nivel === "corretor") return "Acessa documentos e ferramentas comerciais.";
  if (nivel === "social_media") return "Acessa ferramentas e a Central de ajuda.";
  return "Permissão personalizada.";
}

function Badge({
  children,
  destaque = false,
}: {
  children: ReactNode;
  destaque?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        destaque ? "bg-brand-soft text-brand" : "bg-background text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const supabase = await createClient();
  const { erro, sucesso } = await searchParams;

  const { data: membros } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, nivel_acesso, cargo, ativo")
    .order("nome");

  const { data: categoriasRaw } = await supabase.from("usuario_categorias").select("usuario_id, categoria");

  const categoriasPorUsuario = new Map<string, Set<CategoriaProcesso>>();
  (categoriasRaw ?? []).forEach((c) => {
    if (!categoriasPorUsuario.has(c.usuario_id)) categoriasPorUsuario.set(c.usuario_id, new Set());
    categoriasPorUsuario.get(c.usuario_id)!.add(c.categoria);
  });

  const { data: convites } = await supabase
    .from("convites")
    .select("id, email, perfil, nivel_acesso, token, criado_em, expira_em, usado_em")
    .is("usado_em", null)
    .order("criado_em", { ascending: false });

  const siteUrl = await obterSiteUrl();
  const membrosAtivos = (membros ?? []).filter((m) => m.ativo);
  const membrosComFinanceiro = membrosAtivos.filter((m) => temAcessoFinanceiro(m.nivel_acesso));
  const nomesComFinanceiro = membrosComFinanceiro.map((m) => m.nome).join(", ") || "Ninguém";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Equipe e permissões</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Convide a diretora e os outros gerentes pro mesmo espaço de trabalho. Só é possível
          criar conta no Vitral com um link de convite — ninguém de fora consegue se cadastrar
          sozinho.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <WalletCards size={18} strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-ink">Financeiro</p>
          <p className="mt-1 text-2xl font-bold text-ink">{membrosComFinanceiro.length}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Hoje acessam: {nomesComFinanceiro}.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-ink">Regra principal</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            <b>Diretor</b> e <b>Gerente</b> acessam Financeiro e Configurações. O perfil
            operacional não libera o Financeiro sozinho.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Settings size={18} strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-ink">Categorias</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            As categorias só controlam o acesso de <b>Supervisor</b>. Diretor, Gerente e Auxiliar
            seguem a regra do nível de acesso.
          </p>
        </div>
      </div>

      {sucesso && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Link de redefinição de senha enviado pra {sucesso} pessoa{sucesso === "1" ? "" : "s"}.
        </p>
      )}

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {traduzirErroAuth(erro)}
        </p>
      )}

      <form action={reenviarRedefinicaoParaTodos}>
        <BotaoComConfirmacao
          mensagem="Enviar um link de redefinição de senha por e-mail pra todos os membros ativos? Pode levar alguns minutos."
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
        >
          Reenviar redefinição de senha pra todos
        </BotaoComConfirmacao>
      </form>

      <form action={criarConvite} className="space-y-4 rounded-xl border border-border/60 bg-surface shadow-sm p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-ink-muted">
            <UserRoundCog size={16} strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Convidar novo membro</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Escolha o nível com calma: é ele que manda no acesso real ao Financeiro,
              Configurações e áreas internas.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
            <input
              name="email"
              type="email"
              required
              placeholder="diretora@empresa.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Perfil operacional</label>
            <select
              name="perfil"
              defaultValue="gerente"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {PERFIS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Nível de acesso real</label>
            <select
              name="nivel_acesso"
              defaultValue="supervisor"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {NIVEIS.map((n) => (
                <option key={n} value={n}>
                  {NIVEL_ACESSO_LABEL[n]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">
            Categorias visíveis para Supervisor
          </p>
          <div className="flex flex-wrap gap-3">
            {CATEGORIAS.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-ink">
                <input type="checkbox" name="categorias" value={c} className="accent-brand" />
                {CATEGORIA_LABEL[c]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Para liberar Financeiro, use nível <b>Diretor</b> ou <b>Gerente</b>.
          </p>
        </div>
        <BotaoEnviar
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Convidar
        </BotaoEnviar>
      </form>

      {(convites ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Convites pendentes
          </p>
          {(convites ?? []).map((c) => {
            // Server Component: renderiza uma vez por requisição, então ler o relógio aqui é seguro.
            // eslint-disable-next-line react-hooks/purity
            const expirado = new Date(c.expira_em).getTime() < Date.now();
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{c.email}</p>
                  <p className="text-xs text-ink-muted">
                    {c.perfil} · {nivelLabel(c.nivel_acesso)}
                    {expirado ? " · expirado" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {temAcessoFinanceiro(c.nivel_acesso) ? (
                      <Badge destaque>Terá Financeiro</Badge>
                    ) : (
                      <Badge>Sem Financeiro</Badge>
                    )}
                    <Badge>{descricaoNivel(c.nivel_acesso)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!expirado && (
                    <>
                      <BotaoCopiarLink url={`${siteUrl}/login?convite=${c.token}`} />
                      <a
                        href={`/login?convite=${c.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Abrir →
                      </a>
                    </>
                  )}
                  <form action={cancelarConvite}>
                    <input type="hidden" name="id" value={c.id} />
                    <BotaoEnviar
                      className="text-xs font-medium text-ink-muted hover:text-rose-600"
                    >
                      Cancelar
                    </BotaoEnviar>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {(membros ?? []).map((m) => {
          const categoriasAtuais = categoriasPorUsuario.get(m.id) ?? new Set();
          const acessos = acessosEfetivos(m.nivel_acesso, categoriasAtuais);
          const financeiroLiberado = temAcessoFinanceiro(m.nivel_acesso);
          return (
            <div key={m.id} className="rounded-xl border border-border/60 bg-surface shadow-sm p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                    {m.nome
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((parte: string) => parte[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {m.nome}
                      {m.cargo && <span className="ml-2 text-xs font-normal text-ink-muted">{m.cargo}</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{m.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge destaque>{nivelLabel(m.nivel_acesso)}</Badge>
                      <Badge>{m.perfil}</Badge>
                      {m.ativo ? <Badge>Ativo</Badge> : <Badge>Inativo</Badge>}
                      {financeiroLiberado ? <Badge destaque>Financeiro</Badge> : <Badge>Sem Financeiro</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <details key={`nome-${m.id}-${m.nome}`} className="relative">
                    <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                      Editar nome
                    </summary>
                    <form
                      action={editarNomeMembro}
                      className="absolute right-0 z-10 mt-1 flex w-64 gap-1.5 rounded-md border border-border bg-surface p-2 shadow-md"
                    >
                      <input type="hidden" name="usuario_id" value={m.id} />
                      <input
                        name="novo_nome"
                        required
                        defaultValue={m.nome}
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                      <BotaoEnviar
                        className="shrink-0 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Salvar
                      </BotaoEnviar>
                    </form>
                  </details>
                  <details key={`${m.id}-${m.email}`} className="relative">
                    <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                      Editar e-mail
                    </summary>
                    <form
                      action={editarEmailMembro}
                      className="absolute right-0 z-10 mt-1 flex w-64 gap-1.5 rounded-md border border-border bg-surface p-2 shadow-md"
                    >
                      <input type="hidden" name="usuario_id" value={m.id} />
                      <input
                        name="novo_email"
                        type="email"
                        required
                        defaultValue={m.email}
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                      <BotaoEnviar
                        className="shrink-0 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Salvar
                      </BotaoEnviar>
                    </form>
                  </details>
                  <details className="relative">
                    <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                      Trocar senha
                    </summary>
                    <form
                      action={alterarSenhaMembro}
                      className="absolute right-0 z-10 mt-1 flex w-64 gap-1.5 rounded-md border border-border bg-surface p-2 shadow-md"
                    >
                      <input type="hidden" name="usuario_id" value={m.id} />
                      <input
                        name="nova_senha"
                        type="text"
                        required
                        minLength={6}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                      <BotaoEnviar
                        className="shrink-0 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Salvar
                      </BotaoEnviar>
                    </form>
                  </details>
                  <form action={excluirMembro}>
                    <input type="hidden" name="usuario_id" value={m.id} />
                    <BotaoComConfirmacao
                      mensagem={`Excluir o acesso de ${m.nome}? Essa ação não pode ser desfeita — a pessoa não vai mais conseguir entrar no sistema.`}
                      className="text-xs font-medium text-ink-muted hover:text-rose-600"
                    >
                      Excluir acesso
                    </BotaoComConfirmacao>
                  </form>
                </div>
              </div>
              <div className="mb-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Acessos efetivos</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {acessos.map((acesso) => (
                    <Badge key={acesso} destaque={acesso === "Financeiro" || acesso === "Configurações"}>
                      {acesso}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{descricaoNivel(m.nivel_acesso)}</p>
              </div>
              <form action={atualizarCategoriasMembro} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="usuario_id" value={m.id} />
                <select
                  name="nivel_acesso"
                  defaultValue={m.nivel_acesso}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                >
                  {NIVEIS.map((n) => (
                    <option key={n} value={n}>
                      {NIVEL_ACESSO_LABEL[n]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        name="categorias"
                        value={c}
                        defaultChecked={categoriasAtuais.has(c)}
                        className="accent-brand"
                      />
                      {CATEGORIA_LABEL[c]}
                    </label>
                  ))}
                </div>
                <BotaoEnviar
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-background"
                >
                  Salvar permissões
                </BotaoEnviar>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
