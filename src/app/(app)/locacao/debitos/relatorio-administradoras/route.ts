import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarPermissoes } from "../dados";

export const dynamic = "force-dynamic";

const csv = (valor: unknown) => '"' + String(valor ?? "").replace(/"/g, '""').replace(/^[=+@-]/, "'$&") + '"';

export async function GET() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.ver) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  const { data, error } = await supabase.from("contratos_locacao").select(
    "numero, ativo, possui_condominio, condominio_administradora, condominio_contato, condominio_nome, administradora:condominio_administradoras(nome, telefone, email_solicitacao, metodo_consulta)"
  ).eq("ativo", true).order("numero");
  if (error) return NextResponse.json({ erro: "Não foi possível gerar a lista" }, { status: 500 });
  const rows = [
    ["Contrato", "Condomínio", "Administradora cadastrada", "E-mail", "Telefone", "Contato no contrato", "Método", "Condomínio?", "Observação"],
    ...(data ?? []).map((c) => {
      const a = c.administradora as { nome: string; telefone: string | null; email_solicitacao: string | null; metodo_consulta: string } | null;
      const adm = a?.nome ?? c.condominio_administradora ?? "";
      const indef = !a || !adm || /^(x+|n[aã]o tem)$/i.test(adm.trim());
      const conflito = !!a?.telefone && !!c.condominio_contato && a.telefone !== c.condominio_contato
        && /\d{7}/.test(c.condominio_contato.replace(/\D/g,""));
      return [c.numero, c.condominio_nome ?? "", indef ? "" : adm,
        a?.email_solicitacao ?? (adm.includes("@") ? adm : ""),
        a?.telefone ?? (!/x/i.test(c.condominio_contato ?? "") ? c.condominio_contato ?? "" : ""),
        c.condominio_contato ?? "", a?.metodo_consulta ?? "",
        c.possui_condominio === true ? "Sim" : c.possui_condominio === false ? "Não" : "Não informado",
        c.possui_condominio === false ? "Sem condomínio" : indef ? "Administradora para revisar" : conflito ? "Telefone diverge do contrato" : ""];
    })
  ];
  const arquivo = "\uFEFF" + rows.map(row => row.map(csv).join(";")).join("\r\n");
  return new NextResponse(arquivo, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="contratos-administradoras-locacao.csv"',
    "Cache-Control": "private, no-store"
  }});
}
