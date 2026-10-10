import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { obterVgvEmpresa } from "@/lib/vgv-empresa-servidor";
import { PainelSacra } from "./painel";
import { METRICAS_SACRA, TENANT_SACRA, HISTORICO_VGV, CORRETORES_SACRA, PROCESSOS_FORA_DO_ANO } from "./dados";

export default async function PainelSacraPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!usuario.ativo) redirect("/acesso-desativado");
  if (!GESTORES.includes(usuario.nivel_acesso)) redirect("/");
  if (usuario.tenant_id !== TENANT_SACRA) notFound();
  const vgv = await obterVgvEmpresa(await createClient(), usuario.tenant_id, METRICAS_SACRA.ano, HISTORICO_VGV, CORRETORES_SACRA, PROCESSOS_FORA_DO_ANO);
  return <PainelSacra dados={{ ...METRICAS_SACRA, ...vgv }} />;
}
