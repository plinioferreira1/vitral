import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { createClient } from "@/lib/supabase/server";
import { CentralAjuda } from "@/components/central-ajuda";
import { GUIAS_FIXOS } from "@/lib/ajuda/guias";
import { tutorialParaTopico } from "@/lib/ajuda/topicos";

export default async function CorretorPage() {
  const supabase = await createClient();
  const { data: tutoriais } = await supabase
    .from("tutoriais")
    .select("id, categoria, tipo, titulo, descricao, conteudo, link, ordem")
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true });

  const topicos = [...(tutoriais ?? []).map(tutorialParaTopico), ...GUIAS_FIXOS];

  return (
    <div className="w-full min-w-0 space-y-6">
      <CabecalhoPagina titulo="Central de ajuda" descricao="Busque tutoriais, guias, modelos de mensagem e documentos." />
      <CentralAjuda topicos={topicos} />
    </div>
  );
}
