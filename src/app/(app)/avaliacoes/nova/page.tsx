import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { podeAcessarModulo } from "@/lib/avaliacao/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { criarAvaliacao } from "../actions";
import { Campo, Cartao, ROTULO_CLASS } from "../ui";

function Opcao({ name, value, titulo, texto, padrao }: { name: string; value: string; titulo: string; texto: string; padrao?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-surface p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40">
      <input type="radio" name={name} value={value} defaultChecked={padrao} className="mt-1 accent-brand" />
      <span>
        <span className="block font-semibold text-ink">{titulo}</span>
        <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{texto}</span>
      </span>
    </label>
  );
}

export default async function NovaAvaliacaoPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!podeAcessarModulo(usuario.nivel_acesso)) redirect("/");
  const supabase = await createClient();
  const { data: imoveis } = await supabase.from("imoveis").select("id, endereco, regiao_administrativa").order("endereco").limit(500);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <VoltarLink href="/avaliacoes" label="Avaliação de Imóveis" />
        <CabecalhoPagina titulo="Nova avaliação" descricao="Comece pelos dados do cliente e do imóvel. Depois, adicione referências de mercado e personalize o laudo." />
      </div>

      <form action={criarAvaliacao} className="space-y-5">
        <input type="hidden" name="modalidade" value="estudo_comercial" />

        <Cartao titulo="Cliente">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nome do cliente" name="solicitante_nome" />
            <Campo label="Telefone ou e-mail (opcional)" name="solicitante_contato" />
          </div>
        </Cartao>

        <Cartao titulo="Finalidade e tipo de imóvel" descricao="Venda e locação nunca se misturam: cada avaliação usa só comparáveis e unidades da sua finalidade.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <span className={ROTULO_CLASS}>Finalidade</span>
              <Opcao name="finalidade" value="venda" padrao titulo="Venda" texto="Valores totais e R$/m²." />
              <Opcao name="finalidade" value="locacao" titulo="Locação" texto="Aluguel mensal e R$/m²/mês." />
            </div>
            <div className="space-y-2">
              <span className={ROTULO_CLASS}>Tipo de imóvel</span>
              <Opcao name="tipologia" value="residencial" padrao titulo="Residencial" texto="Apartamento, casa, kitnet." />
              <Opcao name="tipologia" value="comercial" titulo="Comercial" texto="Sala, loja, galpão." />
              <Opcao name="tipologia" value="terreno" titulo="Terreno" texto="Lote, chácara, gleba." />
            </div>
          </div>
        </Cartao>

        <Cartao titulo="Imóvel" descricao="Importe um imóvel já cadastrado no Vitral (endereço, matrícula, área e proprietário vêm junto) ou informe o endereço.">
          <div className="space-y-3">
            <label className="block">
              <span className={ROTULO_CLASS}>Imóvel cadastrado no Vitral (opcional)</span>
              <select name="imovel_id" defaultValue="" className={INPUT_CLASS}>
                <option value="">— Não importar: vou preencher —</option>
                {(imoveis ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.endereco}
                    {i.regiao_administrativa ? ` — ${i.regiao_administrativa}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <Campo label="Endereço ou identificação do imóvel" name="titulo" placeholder="Ex.: Rua 16 Sul, lote 4, apto 1007 — Residencial X" ajuda="Obrigatório se nenhum imóvel cadastrado for escolhido." />
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo label="Bairro / região" name="bairro" />
              <Campo label="Cidade" name="cidade" defaultValue="Brasília" />
              <Campo label="Proprietário" name="proprietario_nome" />
              <Campo label="Área do imóvel (m²)" name="area_m2" placeholder="Ex.: 80" />
            </div>
          </div>
        </Cartao>

        <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Criando…">
          Criar e continuar
        </BotaoEnviar>
      </form>
    </div>
  );
}
