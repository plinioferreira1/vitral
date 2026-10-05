import Image from "next/image";
import { ArrowRight, Building2, CalendarCheck2, FileSignature, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { entrar, cadastrar, esqueciSenha } from "./actions";
import { BotaoEnviar } from "@/components/botao-enviar";

const inputClasse =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

const recursos = [
  {
    titulo: "Processos imobiliários",
    texto: "Vendas, financiamentos e locações em uma única visão.",
    Icone: Building2,
  },
  {
    titulo: "Agenda e prazos",
    texto: "Compromissos e vencimentos acompanhados de perto.",
    Icone: CalendarCheck2,
  },
  {
    titulo: "Documentos e financeiro",
    texto: "Contratos, assinaturas, contas e relatórios integrados.",
    Icone: FileSignature,
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    modo?: string;
    enviado?: string;
    redefinida?: string;
    convite?: string;
  }>;
}) {
  const params = await searchParams;
  const modoEsqueci = params.modo === "esqueci";
  const erro = params.erro;

  let convite: { email: string; valido: boolean; nomeEmpresa: string } | null = null;
  if (params.convite) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("convite_validar", { p_token: params.convite }).maybeSingle();
    const conviteData = data as { email: string; valido: boolean; nome_empresa: string } | null;
    if (conviteData) {
      convite = { email: conviteData.email, valido: conviteData.valido, nomeEmpresa: conviteData.nome_empresa };
    }
  }

  const modoCadastro = !!params.convite;
  const tituloCard = modoEsqueci ? "Recuperar senha" : modoCadastro ? "Criar acesso" : "Entrar no Vitral";
  const descricaoCard = modoEsqueci
    ? "Informe seu e-mail para receber um link seguro de redefinição."
    : modoCadastro
      ? "Complete seu cadastro para acessar o ambiente da Sacra."
      : "Acesse o painel de gestão da Sacra Netimóveis.";

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.06fr_0.94fr]">
        <section className="relative overflow-hidden bg-[#4a0b10] px-6 py-8 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute -right-36 top-[16%] h-[30rem] w-[30rem] rounded-full border border-[#d7aa64]/10" />
          <div className="absolute -right-20 top-[22%] h-[22rem] w-[22rem] rounded-full border border-[#d7aa64]/10" />
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/30 to-transparent" />

          <div className="relative flex min-h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <Image
                src="/brand/sacra-logo-dourado.png"
                alt="Sacra Netimóveis"
                width={646}
                height={193}
                priority
                className="h-10 w-auto object-contain sm:h-12"
              />
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/85">
                Vitral
              </span>
            </div>

            <div className="my-auto max-w-2xl py-14 lg:py-16">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7aa64]/35 bg-[#d7aa64]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f3d59b]">
                <Sparkles size={14} strokeWidth={2.2} />
                Gestão de processos inteligentes
              </p>
              <h1 className="max-w-xl text-4xl font-bold leading-[1.02] tracking-[-0.025em] text-white sm:text-5xl">
                Uma visão completa da operação imobiliária.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/75">
                O VITRAL nasceu para transformar a gestão imobiliária. Ao integrar toda a operação
                em uma única plataforma, oferece mais controle, organização e uma visão 360° do
                negócio. Isso permite decisões mais rápidas, seguras e estratégicas.
              </p>

              <div className="mt-9 grid gap-x-7 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-3">
                {recursos.map(({ titulo, texto, Icone }) => (
                  <div key={titulo} className="group">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#d7aa64]/20 bg-[#d7aa64]/15 text-[#f3d59b] transition group-hover:bg-[#d7aa64]/25">
                      <Icone size={18} strokeWidth={2.1} />
                    </span>
                    <p className="text-sm font-semibold text-white">{titulo}</p>
                    <p className="mt-1.5 text-xs leading-5 text-white/60">{texto}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/65">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#f3d59b]" />
                Acesso restrito a usuários autorizados
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />
              <span>Vitral - Sacra Netimóveis</span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <Image src="/brand/vitral-icone-bordo-dourado.svg" alt="" width={44} height={44} className="h-11 w-11" />
              <div>
                <p className="text-sm font-bold text-ink">Vitral</p>
                <p className="text-xs text-ink-muted">Sacra Netimóveis</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(28,25,23,0.12)] backdrop-blur sm:p-7">
              <div className="mb-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Image src="/brand/vitral-icone-bordo-dourado.svg" alt="" width={28} height={28} className="h-7 w-7" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Acesso seguro</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-ink">{tituloCard}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{descricaoCard}</p>
              </div>

              {modoEsqueci ? (
                <>
                  {params.enviado && (
                    <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                      Se esse e-mail estiver cadastrado, enviamos um link pra redefinir a senha.
                    </p>
                  )}

                  {erro && (
                    <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      {erro}
                    </p>
                  )}

                  <form action={esqueciSenha} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">E-mail</label>
                      <input type="email" name="email" required className={inputClasse} placeholder="voce@empresa.com" />
                    </div>
                    <BotaoEnviar
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                      textoEnviando="Enviando..."
                    >
                      Enviar link de redefinição
                    </BotaoEnviar>
                  </form>

                  <a href="/login" className="mt-5 block text-center text-sm font-medium text-ink-muted hover:text-brand">
                    Voltar para o login
                  </a>
                </>
              ) : (
                <>
                  {modoCadastro && convite?.nomeEmpresa && (
                    <p className="mb-4 rounded-lg border border-gold-soft bg-gold-soft/55 px-3 py-2.5 text-sm font-medium text-[#241512]">
                      Convite para {convite.nomeEmpresa}
                    </p>
                  )}

                  {params.redefinida && (
                    <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                      Senha redefinida com sucesso. Entre com a nova senha.
                    </p>
                  )}

                  {erro && (
                    <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      {erro}
                    </p>
                  )}

                  {modoCadastro && !convite?.valido ? (
                    <>
                      <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                        Esse link de convite não é válido ou já expirou. Peça um novo link pra quem já usa o sistema.
                      </p>
                      <a href="/login" className="text-sm font-semibold text-brand hover:underline">
                        Ir para o login
                      </a>
                    </>
                  ) : (
                    <form action={modoCadastro ? cadastrar : entrar} className="space-y-4">
                      {modoCadastro && <input type="hidden" name="convite" value={params.convite} />}
                      {modoCadastro && (
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Nome</label>
                          <input name="nome" required className={inputClasse} placeholder="Seu nome" />
                        </div>
                      )}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-ink-muted">E-mail</label>
                        <input
                          type="email"
                          name="email"
                          required
                          readOnly={modoCadastro}
                          defaultValue={modoCadastro ? (convite?.email ?? "") : undefined}
                          className={`${inputClasse} ${modoCadastro ? "bg-background text-ink-muted" : ""}`}
                          placeholder="voce@empresa.com"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <label className="block text-xs font-semibold text-ink-muted">Senha</label>
                          {!modoCadastro && (
                            <a href="/login?modo=esqueci" className="text-xs font-semibold text-brand hover:underline">
                              Esqueci minha senha
                            </a>
                          )}
                        </div>
                        <input
                          type="password"
                          name="senha"
                          required
                          minLength={6}
                          className={inputClasse}
                          placeholder="Digite sua senha"
                        />
                      </div>
                      <BotaoEnviar
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                        textoEnviando={modoCadastro ? "Criando conta..." : "Entrando..."}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          {modoCadastro ? "Criar conta" : "Entrar"}
                          <ArrowRight size={16} strokeWidth={2.4} />
                        </span>
                      </BotaoEnviar>
                    </form>
                  )}
                </>
              )}
            </div>

            {!modoEsqueci && modoCadastro && convite?.valido && (
              <p className="mt-4 text-center text-xs leading-5 text-ink-muted">
                Esse convite é individual e só funciona até a criação da sua conta.
              </p>
            )}

            {!modoCadastro && !modoEsqueci && (
              <p className="mt-5 text-center text-xs leading-5 text-ink-muted">
                Problemas para acessar? Solicite suporte a um administrador da Sacra.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
