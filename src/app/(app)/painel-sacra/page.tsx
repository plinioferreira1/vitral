import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { PainelSacra } from "./painel";
import { METRICAS_SACRA, TENANT_SACRA } from "./dados";

export default async function PainelSacraPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!usuario.ativo) redirect("/acesso-desativado");
  if (!GESTORES.includes(usuario.nivel_acesso)) redirect("/");
  if (usuario.tenant_id !== TENANT_SACRA) notFound();
  return <PainelSacra dados={METRICAS_SACRA} />;
}
