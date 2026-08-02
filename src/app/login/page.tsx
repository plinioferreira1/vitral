import { entrar, cadastrar, esqueciSenha } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    modo?: string;
    enviado?: string;
    redefinida?: string;
  }>;
}) {
  const params = await searchParams;
  const modoCadastro = params.modo === "cadastro";
  const modoEsqueci = params.modo === "esqueci";
  const erro = params.erro;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/brand/sacra-logo-vertical-bordo.png"
            alt="Sacra Netimóveis"
            className="mx-auto mb-3 h-40 w-auto object-contain"
          />
          <p className="mt-1 text-sm text-ink-muted">Vitral - Gestão de Processos</p>
        </div>

        <div className="rounded-xl border border-border border-t-[3px] border-t-brand bg-surface p-6 shadow-sm">
          {modoEsqueci ? (
            <>
              <p className="mb-4 text-sm font-medium text-ink">Esqueci minha senha</p>

              {params.enviado && (
                <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Se esse e-mail estiver cadastrado, enviamos um link pra redefinir a senha.
                </p>
              )}

              {erro && (
                <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {erro}
                </p>
              )}

              <form action={esqueciSenha} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="voce@empresa.com"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-brand py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Enviar link de redefinição
                </button>
              </form>

              <a href="/login" className="mt-4 block text-center text-xs text-ink-muted hover:underline">
                ← Voltar pro login
              </a>
            </>
          ) : (
            <>
              <div className="mb-5 flex gap-1 rounded-lg bg-background p-1 text-sm">
                <a
                  href="/login"
                  className={`flex-1 rounded-md py-1.5 text-center transition ${
                    !modoCadastro ? "bg-surface font-medium shadow-sm" : "text-ink-muted"
                  }`}
                >
                  Entrar
                </a>
                <a
                  href="/login?modo=cadastro"
                  className={`flex-1 rounded-md py-1.5 text-center transition ${
                    modoCadastro ? "bg-surface font-medium shadow-sm" : "text-ink-muted"
                  }`}
                >
                  Criar conta
                </a>
              </div>

              {params.redefinida && (
                <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Senha redefinida com sucesso. Entre com a nova senha.
                </p>
              )}

              {erro && (
                <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {erro}
                </p>
              )}

              <form action={modoCadastro ? cadastrar : entrar} className="space-y-3">
                {modoCadastro && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-muted">Nome</label>
                    <input
                      name="nome"
                      required
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      placeholder="Seu nome"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="voce@empresa.com"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-ink-muted">Senha</label>
                    {!modoCadastro && (
                      <a href="/login?modo=esqueci" className="text-xs text-brand hover:underline">
                        Esqueci minha senha
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    name="senha"
                    required
                    minLength={6}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-brand py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {modoCadastro ? "Criar conta" : "Entrar"}
                </button>
              </form>
            </>
          )}
        </div>

        {!modoEsqueci && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            {modoCadastro
              ? "Depois de criar sua conta, quem já usa o sistema pode te adicionar à organização."
              : 'Ainda não tem conta? Use "Criar conta" acima.'}
          </p>
        )}
      </div>
    </div>
  );
}
