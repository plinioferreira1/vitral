import { createClient } from "@/lib/supabase/server";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { calcularUrgencia } from "@/lib/alertas";
import { RelatorioSemanal } from "@/components/relatorio-semanal";
import type { ItemRelatorio } from "@/lib/canvas-relatorio-semanal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function RelatorioSemanalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nivel_acesso")
    .eq("id", user?.id ?? "")
    .single();

  const { podeConfigurar } = await getPermissoesUsuario(
    supabase,
    user?.id ?? "",
    usuario?.nivel_acesso ?? ""
  );

  if (!podeConfigurar) {
    return (
      <p className="rounded-xl border border-border/60 bg-surface p-6 text-sm text-ink-muted shadow-sm">
        Essa página é só pra Diretor ou Gerente.
      </p>
    );
  }

  const { data: processosRaw } = await supabase
    .from("processos")
    .select(
      `id, categoria, status,
       imoveis ( endereco ),
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome )`
    )
    .in("categoria", ["venda", "financiamento"])
    .not("status", "in", "(concluido,cancelado)");

  type ProcessoRaw = {
    id: string;
    categoria: "venda" | "financiamento";
    imoveis: { endereco: string } | null;
    comprador: { nome: string } | null;
    vendedor: { nome: string } | null;
  };
  const processos = (processosRaw ?? []) as unknown as ProcessoRaw[];

  const totalAtivosVenda = processos.filter((p) => p.categoria === "venda").length;
  const totalAtivosFinanciamento = processos.filter((p) => p.categoria === "financiamento").length;

  const processoIds = processos.map((p) => p.id);
  const { data: etapasRaw } =
    processoIds.length > 0
      ? await supabase
          .from("etapas")
          .select("processo_id, nome, status, data_prevista, ordem, especial")
          .in("processo_id", processoIds)
          .eq("especial", false)
          .order("ordem", { ascending: true })
      : { data: [] as { processo_id: string; nome: string; status: string; data_prevista: string | null }[] };

  const etapaAtualPorProcesso = new Map<
    string,
    { nome: string; status: string; data_prevista: string | null }
  >();
  (etapasRaw ?? []).forEach((e) => {
    if (etapaAtualPorProcesso.has(e.processo_id)) return; // já achou a primeira não concluída
    if (e.status !== "concluida") {
      etapaAtualPorProcesso.set(e.processo_id, e);
    }
  });

  const atrasados: ItemRelatorio[] = [];
  const vencendo: ItemRelatorio[] = [];

  processos.forEach((p) => {
    const etapa = etapaAtualPorProcesso.get(p.id);
    if (!etapa) return;

    const { urgencia, dias_para_vencer } = calcularUrgencia({
      status: etapa.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
      data_prevista: etapa.data_prevista,
    });

    if (urgencia !== "atrasada" && urgencia !== "vence_hoje" && urgencia !== "vence_em_breve") return;

    const item: ItemRelatorio = {
      categoria: p.categoria === "venda" ? "Venda" : "Financiamento",
      imovel: p.imoveis?.endereco ?? "—",
      cliente: p.comprador?.nome ?? p.vendedor?.nome ?? "—",
      etapaAtual: etapa.nome,
      prazoTexto:
        dias_para_vencer === null
          ? ""
          : dias_para_vencer === 0
            ? "vence hoje"
            : dias_para_vencer > 0
              ? `vence em ${dias_para_vencer} dia${dias_para_vencer > 1 ? "s" : ""}`
              : `atrasada há ${Math.abs(dias_para_vencer)} dia${Math.abs(dias_para_vencer) > 1 ? "s" : ""}`,
    };

    if (urgencia === "atrasada") {
      atrasados.push(item);
    } else {
      vencendo.push(item);
    }
  });

  // atrasados: mais atrasado primeiro. vencendo: mais próximo primeiro.
  atrasados.sort((a, b) => a.prazoTexto.localeCompare(b.prazoTexto));
  vencendo.sort((a, b) => (a.prazoTexto === "vence hoje" ? -1 : a.prazoTexto.localeCompare(b.prazoTexto)));

  const dataLabel = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <RelatorioSemanal
      dados={{
        dataLabel,
        totalAtivosVenda,
        totalAtivosFinanciamento,
        atrasados,
        vencendo,
      }}
    />
  );
}
