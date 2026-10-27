import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CalculadoraAtraso, type ContratoOpcao } from "./calculadora";

const TIPO_CONTA: Record<string, string> = { iptu: "IPTU/TLP", condominio: "Condomínio", agua: "Água", luz: "Energia", gas: "Gás" };

export default async function MultaJurosPage({ searchParams }: { searchParams: Promise<{ contrato?: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) redirect("/");

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [{ data: contratos }, { data: contas }] = await Promise.all([
    supabase
      .from("contratos_locacao")
      .select("id, numero, imoveis ( endereco ), locador:clientes!contratos_locacao_locador_id_fkey ( nome ), locatario:clientes!contratos_locacao_locatario_id_fkey ( nome )")
      .eq("ativo", true)
      .order("numero"),
    supabase
      .from("contas_locacao")
      .select("contrato_id, tipo, competencia, vencimento, valor")
      .eq("status", "pendente")
      .lt("vencimento", hoje)
      .not("valor", "is", null),
  ]);

  const opcoes: ContratoOpcao[] = (contratos ?? []).map((c) => ({
    id: c.id,
    numero: c.numero,
    imovel: (c.imoveis as { endereco: string | null } | null)?.endereco ?? "",
    locador: (c.locador as { nome: string } | null)?.nome ?? "",
    locatario: (c.locatario as { nome: string } | null)?.nome ?? "",
    contasEmAberto: (contas ?? []).filter((k) => k.contrato_id === c.id).map((k) => ({
      descricao: TIPO_CONTA[k.tipo] ?? k.tipo,
      competencia: k.competencia.slice(0, 7),
      vencimento: k.vencimento as string,
      valorCentavos: Math.round(Number(k.valor) * 100),
    })),
  }));

  return (
    <div className="w-full min-w-0 space-y-6">
      <CabecalhoPagina
        titulo="Multa e juros por atraso"
        descricao="Atualize os débitos do locatário com multa, juros e correção do contrato e gere a memória de cálculo em PDF para enviar ao seguro fiança."
      />
      <CalculadoraAtraso contratos={opcoes} hoje={hoje} contratoInicial={(await searchParams).contrato ?? ""} />
    </div>
  );
}
