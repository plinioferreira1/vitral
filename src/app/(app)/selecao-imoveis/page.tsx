import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { SelecaoImoveis } from "./selecao";

export const metadata = { title: "Seleção de imóveis | Vitral" };

export default async function SelecaoImoveisPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo) redirect("/login");
  if (usuario.nivel_acesso === "social_media") redirect("/");
  return (
    <div className="w-full min-w-0 space-y-5">
      <CabecalhoPagina
        titulo="Seleção de imóveis para o cliente"
        descricao="Monte o perfil, pesquise nos portais, cole os anúncios escolhidos e gere uma apresentação em PDF no papel da Sacra."
      />
      <SelecaoImoveis />
    </div>
  );
}
