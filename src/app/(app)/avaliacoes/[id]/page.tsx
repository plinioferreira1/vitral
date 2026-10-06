import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VoltarLink } from "@/components/voltar-link";
import { podeAcessarModulo } from "@/lib/avaliacao/permissoes";
import { ETAPAS_EDITOR, ROTULO_FINALIDADE, ROTULO_MODALIDADE, ROTULO_TIPOLOGIA, valorDaListaLocal, type EtapaEditor } from "@/lib/avaliacao/tipos";
import { etapasDaAvaliacao, etapaDoFluxo } from "@/lib/avaliacao/fluxo";
import { validarParaEmissao } from "@/lib/avaliacao/validacao";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { BUCKET_AVALIACOES, carregarAvaliacao, papelDe } from "../dados";
import { Aviso, SeloStatus } from "../ui";
import { EtapaComparaveis, type VendaInterna } from "./etapas/comparaveis";
import { EtapaDados, EtapaImovel, EtapaLocalizacao, EtapaTextos, EtapaVistoria } from "./etapas/formularios";
import { EtapaPreco } from "./etapas/preco";
import { EtapaHistorico, EtapaRevisao } from "./etapas/revisao";

// Emissão gera o PDF e guarda o arquivo: pode levar alguns segundos.
export const maxDuration = 60;

const CHAVES = ETAPAS_EDITOR.map((e) => e.chave);

export default async function AvaliacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const [{ id }, { etapa: etapaParam }] = await Promise.all([params, searchParams]);
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!podeAcessarModulo(usuario.nivel_acesso)) redirect("/");
  const tenantId = usuario.tenant_id;
  const supabase = await createClient();
  const c = await carregarAvaliacao(supabase, id, tenantId);
  if (!c) notFound();

  const a = c.avaliacao;
  const etapas = etapasDaAvaliacao(a.modalidade);
  const comercial = a.modalidade === "estudo_comercial";
  const etapa = etapaDoFluxo(a.modalidade, valorDaListaLocal<EtapaEditor>(CHAVES, etapaParam, a.status === "em_revisao" || a.status === "aprovado" ? "revisao" : "dados"));
  const papel = papelDe({ userId: user.id, nivel: usuario.nivel_acesso }, c.config);
  const validacao = validarParaEmissao(c.conteudo);
  const pendenciasPorEtapa = new Map<string, number>();
  for (const b of validacao.bloqueios) {
    const destino = etapaDoFluxo(a.modalidade, b.etapa as EtapaEditor);
    pendenciasPorEtapa.set(destino, (pendenciasPorEtapa.get(destino) ?? 0) + 1);
  }

  // Dados extras, só os que a etapa aberta usa.
  const caminhos =
    etapa === "imovel" || etapa === "vistoria" || (comercial && etapa === "dados")
      ? c.arquivos.map((x) => x.caminho_storage)
      : etapa === "comparaveis"
        ? (c.comparaveis.map((x) => x.foto_caminho).filter(Boolean) as string[])
        : [];
  const [assinados, vendasRaw, versoesRes, eventosRes, assinaturaRes] = await Promise.all([
    caminhos.length ? supabase.storage.from(BUCKET_AVALIACOES).createSignedUrls(caminhos, 3600) : Promise.resolve({ data: [] }),
    etapa === "comparaveis" && a.finalidade === "venda"
      ? supabase
          .from("processos")
          .select("id, numero_processo, status, valor_total, data_assinatura, data_conclusao, criado_em, imoveis ( endereco, area_construida, regiao_administrativa )")
          .eq("categoria", "venda")
          .in("status", ["ativo", "concluido"])
          .gt("valor_total", 0)
          .order("criado_em", { ascending: false })
          .limit(150)
      : Promise.resolve({ data: [] }),
    etapa === "historico"
      ? supabase.from("avaliacao_versoes").select("*").eq("avaliacao_id", id).order("numero", { ascending: false })
      : Promise.resolve({ data: [] }),
    etapa === "historico"
      ? supabase.from("avaliacao_eventos").select("*").eq("avaliacao_id", id).order("criado_em", { ascending: false }).limit(300)
      : Promise.resolve({ data: [] }),
    etapa === "revisao" && papel.ehResponsavelTecnica
      ? supabase.from("avaliacao_assinaturas").select("usuario_id").eq("usuario_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const urls: Record<string, string> = {};
  for (const item of assinados.data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  const vendasInternas: VendaInterna[] = ((vendasRaw.data ?? []) as unknown as {
    id: string;
    numero_processo: string;
    status: string;
    valor_total: number;
    data_assinatura: string | null;
    data_conclusao: string | null;
    imoveis: { endereco: string; area_construida: string | null; regiao_administrativa: string | null } | null;
  }[]).map((p) => ({
    id: p.id,
    numero_processo: p.numero_processo,
    status: p.status,
    valor_total: Number(p.valor_total),
    data: p.data_conclusao ?? p.data_assinatura,
    endereco: p.imoveis?.endereco ?? p.numero_processo,
    regiao: p.imoveis?.regiao_administrativa ?? null,
    area: p.imoveis?.area_construida?.trim() || null,
  }));

  const propsEtapa = { c, tenantId, urls };
  const indice = etapas.findIndex((e) => e.chave === etapa);
  const proxima = indice < etapas.length - 2 ? etapas[indice + 1] : null;

  return (
    <div className="space-y-5">
      <div>
        <VoltarLink href="/avaliacoes" label="Avaliação de Imóveis" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{a.titulo}</h1>
          <SeloStatus status={a.status} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {a.codigo} · {ROTULO_MODALIDADE[a.modalidade]} · {ROTULO_FINALIDADE[a.finalidade]} · {ROTULO_TIPOLOGIA[a.tipologia]}
          {a.versao_atual > 0 ? ` · última versão emitida: ${a.versao_atual}` : ""}
        </p>
      </div>

      {c.linha.comentario_revisao && a.status === "rascunho" && (
        <Aviso tom="alerta">
          <strong>Devolvido para ajustes:</strong> {c.linha.comentario_revisao}
        </Aviso>
      )}
      {a.status === "emitido" && etapa !== "historico" && etapa !== "revisao" && (
        <Aviso tom="info">Esta avaliação tem a versão {a.versao_atual} emitida. Se você salvar alguma alteração, abre-se uma nova revisão (rascunho) e a versão emitida continua guardada.</Aviso>
      )}
      {(a.status === "aprovado" || a.status === "em_revisao") && etapa !== "historico" && etapa !== "revisao" && (
        <Aviso tom="alerta">Esta avaliação está {a.status === "aprovado" ? "aprovada" : "em revisão"}. Qualquer alteração salva devolve o documento a rascunho e exige nova revisão.</Aviso>
      )}

      <nav aria-label="Etapas" className="-mx-1 overflow-x-auto">
        <ol className="flex min-w-max gap-1 px-1 pb-1">
          {etapas.map((e, i) => {
            const ativo = e.chave === etapa;
            const pendencias = pendenciasPorEtapa.get(e.chave) ?? 0;
            return (
              <li key={e.chave}>
                <Link
                  href={`/avaliacoes/${a.id}?etapa=${e.chave}`}
                  aria-current={ativo ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    ativo ? "border-brand bg-brand text-white" : "border-border/80 bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  <span className={`num text-xs ${ativo ? "text-white/80" : "text-ink-muted"}`}>{i + 1}</span>
                  {e.rotulo}
                  {pendencias > 0 && (
                    <span className={`num rounded-full px-1.5 text-[11px] font-bold ${ativo ? "bg-white text-brand" : "bg-rose-100 text-rose-700"}`} title={`${pendencias} pendência(s) para emitir`}>
                      {pendencias}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {etapa === "dados" && (
        <div className="space-y-5">
          <EtapaDados {...propsEtapa} />
          {comercial && <>
            <EtapaImovel {...propsEtapa} />
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-ink">Vistoria e características observadas</summary>
              <div className="mt-4"><EtapaVistoria {...propsEtapa} /></div>
            </details>
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-ink">Localização e entorno</summary>
              <div className="mt-4"><EtapaLocalizacao {...propsEtapa} /></div>
            </details>
          </>}
        </div>
      )}
      {etapa === "imovel" && <EtapaImovel {...propsEtapa} />}
      {etapa === "vistoria" && <EtapaVistoria {...propsEtapa} />}
      {etapa === "localizacao" && <EtapaLocalizacao {...propsEtapa} />}
      {etapa === "comparaveis" && <EtapaComparaveis {...propsEtapa} vendasInternas={vendasInternas} />}
      {etapa === "preco" && <EtapaPreco c={c} />}
      {etapa === "textos" && <EtapaTextos {...propsEtapa} />}
      {etapa === "revisao" && <EtapaRevisao c={c} papel={papel} validacao={validacao} temAssinatura={!!assinaturaRes.data} />}
      {etapa === "historico" && <EtapaHistorico c={c} versoes={versoesRes.data ?? []} eventos={eventosRes.data ?? []} />}

      {proxima && (
        <div className="flex justify-end">
          <Link href={`/avaliacoes/${a.id}?etapa=${proxima.chave}`} className="text-sm font-medium text-brand hover:underline">
            Próxima etapa: {proxima.rotulo} →
          </Link>
        </div>
      )}
    </div>
  );
}
