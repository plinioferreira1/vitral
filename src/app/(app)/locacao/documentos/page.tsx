import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  filtrarDocumentos,
  identificacaoUnidade,
  pendenciasCadastro,
  ROTULO_TIPO,
  tipoDocumento,
  TIPOS_DOCUMENTO,
  type DocumentoListado,
} from "@/lib/locacao/documentos";
import { tabelaDocumentos, type LinhaDocumentoLocacao } from "@/lib/locacao/documentos-banco";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

export const metadata = { title: "Documentos da Locação | Vitral" };

const BOTAO = "inline-flex min-h-11 items-center rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-background sm:min-h-8";

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

type Contrato = {
  id: string;
  numero: string | null;
  ativo: boolean;
  possui_condominio: boolean | null;
  condominio_nome: string | null;
  condominio_bloco: string | null;
  condominio_unidade: string | null;
  imoveis: { endereco: string } | null;
  locatario: { nome: string } | null;
};

/** Todos os documentos dos contratos de locação, com busca e filtro por tipo. */
export default async function DocumentosLocacaoPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const { data: temLocacao } = await supabase.rpc("usuario_tem_categoria", { p_categoria: "locacao" });
  if (temLocacao !== true) redirect("/");

  const { q = "", tipo: tipoParam } = await searchParams;
  const tipo = tipoDocumento(tipoParam);

  const [{ data: contratosRaw }, { data: docsRaw, error: erroDocs }] = await Promise.all([
    supabase
      .from("contratos_locacao")
      .select("id, numero, ativo, possui_condominio, condominio_nome, condominio_bloco, condominio_unidade, imoveis ( endereco ), locatario:clientes!contratos_locacao_locatario_id_fkey ( nome )")
      .eq("tenant_id", usuario.tenant_id)
      .order("numero"),
    tabelaDocumentos(supabase)
      .select("id, contrato_id, tipo, nome, data_documento, criado_em")
      .eq("tenant_id", usuario.tenant_id)
      .returns<Pick<LinhaDocumentoLocacao, "id" | "contrato_id" | "tipo" | "nome" | "data_documento" | "criado_em">[]>(),
  ]);
  const contratos = (contratosRaw ?? []) as unknown as Contrato[];
  const porId = new Map(contratos.map((c) => [c.id, c]));

  const todos: DocumentoListado[] = (docsRaw ?? []).flatMap((d) => {
    const c = porId.get(d.contrato_id);
    if (!c) return [];
    return [{
      id: d.id,
      tipo: d.tipo,
      nome: d.nome,
      data_documento: d.data_documento,
      criado_em: d.criado_em,
      contrato: {
        id: c.id,
        numero: c.numero,
        endereco: c.imoveis?.endereco ?? "",
        unidade: identificacaoUnidade(c),
        locatario: c.locatario?.nome ?? null,
      },
    }];
  });
  const documentos = filtrarDocumentos(todos, q, tipo);
  const incompletos = contratos
    .filter((c) => c.ativo)
    .map((c) => ({ c, falta: pendenciasCadastro({ ...c, endereco: c.imoveis?.endereco }) }))
    .filter((x) => x.falta.length > 0);
  const filtrando = q.trim() !== "" || tipo !== null;

  return (
    <div className="w-full min-w-0 space-y-5">
      <CabecalhoPagina titulo="Documentos da Locação" descricao="Contratos, aditivos, vistorias, termos e seguros de todos os contratos. Para anexar, abra o contrato." />

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
        <label className="min-w-0 flex-1 basis-64 text-xs font-medium text-ink-muted">
          Buscar
          <input name="q" defaultValue={q} placeholder="Endereço, condomínio, unidade, locatário ou nº do contrato" className={`${INPUT_CLASS} mt-1 min-h-11`} />
        </label>
        <label className="basis-44 text-xs font-medium text-ink-muted">
          Tipo
          <select name="tipo" defaultValue={tipo ?? ""} className={`${INPUT_CLASS} mt-1 min-h-11`}>
            <option value="">Todos</option>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${PRIMARY_BUTTON_CLASS} min-h-11`}>Filtrar</button>
        {filtrando && <Link href="/locacao/documentos" className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline">Limpar</Link>}
      </form>

      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-label="Documentos encontrados">
        {erroDocs ? (
          <p className="text-sm text-ink-muted">Os documentos ainda não estão disponíveis. Tente de novo em instantes.</p>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {filtrando ? "Nenhum documento encontrado com esses filtros." : "Nenhum documento anexado ainda. Abra um contrato e use “Anexar documento”."}
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-muted">{documentos.length} documento(s)</p>
            <ul className="divide-y divide-border/60">
              {documentos.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1 basis-72">
                    <p className="break-words text-sm font-medium text-ink">{d.nome}</p>
                    <p className="text-[11px] text-ink-muted">
                      {[ROTULO_TIPO[d.tipo], d.contrato.unidade, d.contrato.locatario && `Locatário: ${d.contrato.locatario}`, d.data_documento && dataBR(d.data_documento)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`/locacao/${d.contrato.id}/documentos/${d.id}`} target="_blank" rel="noopener noreferrer" className={BOTAO}>Abrir</a>
                    <a href={`/locacao/${d.contrato.id}/documentos/${d.id}?baixar=1`} className={BOTAO}>Baixar</a>
                    <Link href={`/locacao/${d.contrato.id}#documentos-contrato`} className={BOTAO}>Contrato</Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {incompletos.length > 0 && (
        <details className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-amber-900">
            {incompletos.length} contrato(s) ativo(s) com identificação incompleta
          </summary>
          <p className="mt-2 text-xs text-amber-900">Endereço completo, condomínio e unidade deixam os documentos fáceis de achar e evitam erro nas solicitações às administradoras.</p>
          <ul className="mt-3 space-y-1.5">
            {incompletos.map(({ c, falta }) => (
              <li key={c.id} className="text-sm">
                <Link href={`/locacao/${c.id}#dados-contrato`} className="font-medium text-brand hover:underline">
                  {c.imoveis?.endereco || `Contrato ${c.numero ?? ""}`}
                </Link>
                <span className="text-xs text-ink-muted"> — falta: {falta.join(", ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
