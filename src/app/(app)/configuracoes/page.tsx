import { notFound } from "next/navigation";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ConfiguracoesPainel } from "@/components/configuracoes-painel";

export default async function ConfiguracoesPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) notFound();
  return <div className="mx-auto w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Configurações" descricao="Gerencie os acessos, modelos, rotinas e integrações da empresa. Escolha uma área ou busque a configuração que precisa." />
    <ConfiguracoesPainel />
  </div>;
}
