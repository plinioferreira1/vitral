import Image from "next/image";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { redefinirSenha } from "@/app/login/actions";
import { BotaoEnviar } from "@/components/botao-enviar";

const inputClasse =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.06fr_0.94fr]">
        <section className="relative overflow-hidden bg-[#4a0b10] px-6 py-8 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(0deg,rgba(185,130,44,.16)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/25 to-transparent" />

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

            <div className="my-auto max-w-xl py-14 lg:py-20">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7aa64]/35 bg-[#d7aa64]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f3d59b]">
                <ShieldCheck size={14} strokeWidth={2.2} />
                Acesso seguro
              </p>
              <h1 className="max-w-xl text-4xl font-bold leading-[1.02] tracking-[-0.01em] text-white sm:text-5xl">
                Defina uma nova senha para o Vitral.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
                Depois de salvar, você volta para a tela de login e entra com a nova senha.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/65">
              <span className="inline-flex items-center gap-2">
                <LockKeyhole size={15} className="text-[#f3d59b]" />
                Redefinição protegida pelo Supabase Auth
              </span>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Nova senha</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-ink">Atualizar acesso</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  Escolha uma senha com pelo menos 6 caracteres para continuar usando o Vitral.
                </p>
              </div>

              {erro && (
                <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {erro}
                </p>
              )}

              <form action={redefinirSenha} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Nova senha</label>
                  <input
                    type="password"
                    name="senha"
                    required
                    minLength={6}
                    className={inputClasse}
                    placeholder="Digite a nova senha"
                  />
                </div>
                <BotaoEnviar
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                  textoEnviando="Salvando..."
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    Salvar nova senha
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </span>
                </BotaoEnviar>
              </form>
            </div>

            <a href="/login" className="mt-5 block text-center text-sm font-medium text-ink-muted hover:text-brand">
              Voltar para o login
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
