import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { REGIOES_ADMINISTRATIVAS_DF } from "@/lib/circunscricoes-df";
import { CampoCPF } from "@/components/campo-cpf";
import { criarAutorizacao } from "../actions";
import { User, Home } from "lucide-react";

export default function NovaAutorizacaoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <VoltarLink href="/autorizacoes" label="Autorizações" />
        <CabecalhoPagina titulo="Nova autorização de venda" descricao={<>Depois de criar, você vai poder copiar o link de assinatura de cada proprietário, ou
          passar o celular/tablet pra assinarem na hora.</>} />
      </div>

      <form action={criarAutorizacao} className={`${CARD_CLASS} space-y-6 p-5 sm:p-7`}>
        <div>
          <p className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-ink">
            <User size={14} strokeWidth={2} />
            Proprietário(a)
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Nome completo do proprietário</span><input id="vendedor_nome"
              name="vendedor_nome"
              required
              placeholder="Nome completo"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CPF do proprietário</span><CampoCPF id="vendedor_cpf" name="vendedor_cpf" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">RG do proprietário</span><input id="vendedor_rg"
                name="vendedor_rg"
                placeholder="RG"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Telefone do proprietário</span><input type="tel" id="vendedor_telefone"
                name="vendedor_telefone"
                placeholder="Telefone"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do proprietário</span><input id="vendedor_endereco"
                name="vendedor_endereco"
                placeholder="Endereço"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
          </div>
        </div>

        <details className="group rounded-xl border border-border bg-background/50 p-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand">
            + Adicionar cônjuge / segundo proprietário
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Nome completo do segundo proprietário</span><input id="conjuge_nome"
              name="conjuge_nome"
              placeholder="Nome completo"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CPF do segundo proprietário</span><CampoCPF id="conjuge_cpf" name="conjuge_cpf" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">RG do segundo proprietário</span><input id="conjuge_rg"
                name="conjuge_rg"
                placeholder="RG"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Telefone do segundo proprietário</span><input type="tel" id="conjuge_telefone"
                name="conjuge_telefone"
                placeholder="Telefone"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do segundo proprietário</span><input id="conjuge_endereco"
                name="conjuge_endereco"
                placeholder="Endereço"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
          </div>
        </details>

        <div>
          <p className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-ink">
            <Home size={14} strokeWidth={2} />
            Imóvel
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do imóvel</span><input id="imovel"
              name="imovel"
              required
              placeholder="Endereço completo do imóvel"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            /></label>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="regiao_administrativa">
                Região Administrativa
              </label>
              <input id="regiao_administrativa"
                name="regiao_administrativa"
                required
                list="regioes-administrativas"
                placeholder="Ex: Águas Claras"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              />
              <datalist id="regioes-administrativas">
                {REGIOES_ADMINISTRATIVAS_DF.map((ra) => (
                  <option key={ra} value={ra} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-ink-muted">
                Usada só pra calcular o foro certo no documento (a circunscrição judiciária do
                imóvel). Comece a digitar pra ver sugestões.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CEP</span><input id="cep"
                name="cep"
                placeholder="CEP"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Matrícula</span><input id="matricula"
                name="matricula"
                placeholder="Matrícula"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Área construída (m²)</span><input id="area_construida"
                name="area_construida"
                placeholder="Área construída (m²)"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Área do lote (m²)</span><input id="area_lote"
                name="area_lote"
                placeholder="Área do lote (m²)"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Inscrição de IPTU</span><input id="inscricao_iptu"
                name="inscricao_iptu"
                placeholder="Inscrição de IPTU"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Condomínio mensal</span><CampoMoeda id="valor_condominio" name="valor_condominio" placeholder="Condomínio (R$)" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} /></label>
            </div>
          </div>
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/50 p-3 text-sm text-ink">
          <input type="checkbox" name="segundo_proprietario" className="h-4 w-4 shrink-0 accent-brand" />
          O cônjuge/segundo proprietário também precisa assinar
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="valor_imovel">Valor de anúncio</label>
            <CampoMoeda id="valor_imovel" name="valor_imovel" placeholder="500.000,00" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="comissao_percentual">Comissão (%)</label>
            <input id="comissao_percentual"
              name="comissao_percentual"
              type="number"
              step="0.01"
              placeholder="6"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prazo_dias">
            Prazo da autorização (dias)
          </label>
          <input id="prazo_dias"
            name="prazo_dias"
            type="number"
            defaultValue={90}
            className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
          />
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/50 p-3 text-sm text-ink">
          <input type="checkbox" name="exclusividade" className="h-4 w-4 shrink-0 accent-brand" />
          Com exclusividade
        </label>

        <div>
          <label htmlFor="observacoes" className="mb-1 block text-xs font-medium text-ink-muted">
            Descrição do imóvel / Observações (opcional)
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            placeholder="Ex: taxa extra do PATE, R$ 280,00"
            className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
          />
        </div>

        <BotaoSubmit className={`${PRIMARY_BUTTON_CLASS} min-h-11 w-full`}>
          Criar autorização
        </BotaoSubmit>
      </form>
    </div>
  );
}
