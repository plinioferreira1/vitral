import { notFound } from "next/navigation";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { NavegacaoFinanceiro } from "@/components/financeiro/navegacao-financeiro";

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) notFound();
  return <div className="mx-auto w-full min-w-0 space-y-6"><NavegacaoFinanceiro />{children}</div>;
}
