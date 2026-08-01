import { redefinirSenha } from "@/app/login/actions";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/brand/sacra-logo-bordo.png"
            alt="Sacra Netimóveis"
            className="mx-auto mb-4 h-12 w-auto object-contain"
          />
          <h1 className="text-lg font-serif font-semibold text-ink">Nova senha</h1>
          <p className="mt-1 text-sm text-ink-muted">Digite a nova senha da sua conta.</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-6 shadow-sm">
          {erro && (
            <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {erro}
            </p>
          )}
          <form action={redefinirSenha} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Nova senha</label>
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
              Salvar nova senha
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
