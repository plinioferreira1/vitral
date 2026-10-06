import { redirect } from "next/navigation";
import { CARD_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { localDe } from "@/lib/dp/ponto";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoDP } from "../../dados";
import { FormColaborador } from "../form";

export default async function NovoColaboradorPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.administrador) redirect("/dp");
  const [{ data: colaboradores }, { data: usuarios }] = await Promise.all([supabase.from("dp_colaboradores").select("id, nome, usuario_id").neq("status", "desligado").order("nome"), supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome")]);
  const ocupados = new Set((colaboradores ?? []).map((c) => c.usuario_id).filter(Boolean));
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <VoltarLink href="/dp/colaboradores" label="Colaboradores" />
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Novo colaborador</h1>
      </div>
      <div className={`${CARD_CLASS} p-4 sm:p-6`}>
        <FormColaborador c={null} config={acesso.config} colaboradores={colaboradores ?? []} usuarios={(usuarios ?? []).map((u) => ({ ...u, ocupado: ocupados.has(u.id) }))} hoje={localDe(new Date().toISOString()).data} />
      </div>
    </div>
  );
}
