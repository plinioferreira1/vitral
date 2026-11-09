import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import type { Conjuge, Pessoa } from "@/lib/contratos-locacao/montar";
import { createClient } from "@/lib/supabase/server";
import { GESTORES, getUsuarioAtual } from "@/lib/usuario-atual";
import { GeradorContratos, type ContratoOpcao, type FichaOpcao } from "./gerador";

type Dados = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "").trim();

function pessoaDaFicha(d: Dados): Pessoa {
  const cidadeUf = [s(d.cidade), s(d.uf)].filter(Boolean).join("/");
  return {
    nome: s(d.nome_completo),
    nacionalidade: s(d.nacionalidade),
    profissao: s(d.profissao),
    cpf: s(d.cpf),
    rg: s(d.rg),
    email: s(d.email),
    estadoCivil: s(d.estado_civil),
    endereco: [s(d.endereco), s(d.complemento), cidadeUf, s(d.cep) && `CEP ${s(d.cep)}`].filter(Boolean).join(", "),
  };
}

function conjugeDaFicha(d: Dados): Conjuge | null {
  if (!s(d.conjuge_nome)) return null;
  return { nome: s(d.conjuge_nome), cpf: s(d.conjuge_cpf), rg: "", nacionalidade: "", profissao: s(d.conjuge_profissao), email: s(d.conjuge_email) };
}

const GARANTIA_DA_FICHA: Record<string, string> = {
  "Seguro Fiança": "seguro_fianca",
  "Garantia Investe": "garantia_investe",
  "Título de Capitalização": "titulo_capitalizacao",
  Fiador: "fiador",
};

export default async function ContratosLocacaoPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!GESTORES.includes(usuario.nivel_acesso)) redirect("/locacao");
  const supabase = await createClient();

  const [{ data: fichas }, { data: contratos }] = await Promise.all([
    supabase
      .from("fichas_cadastrais_locacao")
      .select("id, tipo_locatario, ficha_principal_id, numero_fiador, proponente_nome, dados, status, concluido_em")
      .eq("status", "concluida")
      .order("concluido_em", { ascending: false })
      .limit(500),
    supabase
      .from("contratos_locacao")
      .select(
        "id, numero, iptu_inscricao, imoveis ( endereco, matricula, inscricao_iptu, area_construida ), locador:clientes!contratos_locacao_locador_id_fkey ( nome, cpf_cnpj, rg, email, endereco )"
      )
      .eq("ativo", true)
      .order("numero"),
  ]);

  const todas = fichas ?? [];
  const opcoesFicha: FichaOpcao[] = todas
    .filter((f) => f.tipo_locatario === "titular")
    .map((f) => {
      const d = (f.dados ?? {}) as Dados;
      const fiadores = todas
        .filter((x) => x.tipo_locatario === "fiador" && x.ficha_principal_id === f.id)
        .sort((a, b) => (a.numero_fiador ?? 9) - (b.numero_fiador ?? 9))
        .slice(0, 2)
        .map((x) => {
          const dx = (x.dados ?? {}) as Dados;
          return { pessoa: pessoaDaFicha(dx), conjuge: conjugeDaFicha(dx) };
        });
      return {
        id: f.id,
        rotulo: `${f.proponente_nome || s(d.nome_completo) || "Sem nome"}${s(d.imovel_interesse) ? ` — ${s(d.imovel_interesse)}` : ""}`,
        locatario: pessoaDaFicha(d),
        fiadores,
        garantia: GARANTIA_DA_FICHA[s(d.garantia)] ?? "",
        imovelInteresse: s(d.imovel_interesse),
      };
    });

  const opcoesContrato: ContratoOpcao[] = (contratos ?? []).map((c) => {
    const im = c.imoveis as { endereco: string | null; matricula: string | null; inscricao_iptu: string | null; area_construida: number | null } | null;
    const loc = c.locador as { nome: string | null; cpf_cnpj: string | null; rg: string | null; email: string | null; endereco: string | null } | null;
    return {
      id: c.id,
      rotulo: `${c.numero ?? "Contrato"} — ${im?.endereco ?? "sem imóvel"}`,
      locador: { nome: loc?.nome ?? "", cpf: loc?.cpf_cnpj ?? "", rg: loc?.rg ?? "", email: loc?.email ?? "", endereco: loc?.endereco ?? "" },
      imovel: {
        endereco: im?.endereco ?? "",
        matricula: im?.matricula ?? "",
        inscricaoIptu: c.iptu_inscricao || im?.inscricao_iptu || "",
        areaPrivativa: im?.area_construida ? `${String(im.area_construida).replace(".", ",")} m²` : "",
      },
    };
  });

  return (
    <div className="w-full min-w-0 space-y-5">
      <CabecalhoPagina
        titulo="Gerar contratos de locação"
        descricao="Contrato de locação residencial (fiador, Seguro Fiança, Garantia Investe ou Título de Capitalização) e contrato de prestação de serviços com o proprietário, nas minutas da Sacra. Os dados vêm da ficha cadastral e do contrato cadastrado; confira tudo antes de gerar. O PDF sai pronto para subir no CredSign. Nada digitado aqui é gravado — inclusive os dados bancários dos beneficiários."
      />
      <GeradorContratos fichas={opcoesFicha} contratos={opcoesContrato} />
    </div>
  );
}
