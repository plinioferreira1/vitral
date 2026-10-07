import { CheckCircle2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_TIPO, tipoLocatario, type DadosFicha } from "@/lib/ficha-locacao/campos";
import { FormularioFicha, type PropostaDoTitular } from "./formulario-ficha";
import type { SupabaseClient } from "@supabase/supabase-js";

type Documento = { id: string; nome_arquivo: string; tipo: string };

export default async function FichaPublicaLocacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: ficha } = await admin.from("fichas_cadastrais_locacao").select("id, status, dados, expira_em, imovel_referencia, concluido_em, tipo_locatario, ficha_principal_id").eq("token", token).maybeSingle();
  // A validade precisa ser conferida no instante da requisição pública.
  // eslint-disable-next-line react-hooks/purity
  const indisponivel = !ficha || ficha.status === "cancelada" || new Date(ficha.expira_em).getTime() < Date.now();
  const tipo = tipoLocatario(ficha?.tipo_locatario);
  const [{ data: documentos }, { data: principal }] = await Promise.all([
    ficha ? admin.from("ficha_locacao_documentos").select("id, nome_arquivo, tipo").eq("ficha_id", ficha.id).order("criado_em") : Promise.resolve({ data: [] as Documento[] }),
    // Fiador e corresponsável veem só o resumo da proposta: titular, imóvel e garantia.
    ficha?.ficha_principal_id ? admin.from("fichas_cadastrais_locacao").select("proponente_nome, imovel_referencia, dados").eq("id", ficha.ficha_principal_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const dadosPrincipal = (principal?.dados ?? {}) as DadosFicha;
  const proposta: PropostaDoTitular | null = principal ? { titular: String(dadosPrincipal.nome_completo ?? principal.proponente_nome ?? ""), imovel: String(dadosPrincipal.imovel_interesse ?? principal.imovel_referencia ?? ""), garantia: String(dadosPrincipal.garantia ?? ""), valor: String(dadosPrincipal.valor_proposta ?? "") } : null;
  return <main className="min-h-screen bg-[#f7f5f2] px-4 py-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 text-center"><Image src="/brand/sacra-logo-vertical-bordo.png" alt="Sacra Netimóveis" width={240} height={120} priority className="mx-auto h-20 w-auto object-contain sm:h-24" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b9822c]">Ficha cadastral de locação{ficha && tipo !== "titular" ? ` · ${ROTULO_TIPO[tipo]}` : ""}</p></header>
      {indisponivel ? <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-10 w-10 text-stone-400" /><h1 className="mt-4 text-xl font-bold">Link indisponível</h1><p className="mt-2 text-sm text-stone-500">Este link expirou ou foi cancelado. Solicite uma nova ficha à equipe da SACRA.</p></div> : ficha.status === "concluida" ? <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold text-stone-900">Ficha enviada com sucesso</h1><p className="mt-2 text-sm text-stone-600">Recebemos seus dados e documentos. A equipe da SACRA dará continuidade à análise.</p></div> : <><div className="mb-5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p>Ambiente seguro. Seus dados e documentos serão utilizados exclusivamente na análise da locação de <strong>{ficha.imovel_referencia}</strong>.</p></div></div><FormularioFicha token={token} tipo={tipo} proposta={proposta} iniciais={(ficha.dados ?? {}) as DadosFicha} documentosIniciais={documentos ?? []} /></>}
      <footer className="mt-8 text-center text-xs text-stone-400">SACRA Netimóveis · Brasília/DF</footer>
    </div>
  </main>;
}
