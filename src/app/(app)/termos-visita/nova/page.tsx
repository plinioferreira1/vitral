import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { hojeISO } from "@/lib/data-br";
import { criarTermoVisita } from "../actions";
import { Home, User } from "lucide-react";

export default function NovoTermoVisitaPage() {
  const hoje = hojeISO();

  return (
    <div className="mx-auto w-full min-w-0 space-y-6">
      <div>
        <VoltarLink href="/termos-visita" label="Termos de Visita" />
        <CabecalhoPagina titulo="Novo termo de visita" descricao={<>Depois de criar, você vai poder copiar o link de assinatura, ou passar o
          celular/tablet pro cliente assinar na hora, ao fim da visita.</>} />
      </div>

      <form
        action={criarTermoVisita}
        className={`${CARD_CLASS} space-y-6 p-5 sm:p-7`}
      >
        <div>
          <p className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-ink">
            <Home size={14} strokeWidth={2} />
            Imóvel visitado
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do imóvel</span><input id="imovel"
              name="imovel"
              required
              placeholder="Endereço do imóvel"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Código do imóvel (opcional)</span><input id="codigo_imovel"
                name="codigo_imovel"
                placeholder="Código do imóvel (opcional)"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Valor do imóvel</span><CampoMoeda id="valor_imovel" name="valor_imovel" placeholder="Valor do imóvel" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} /></label>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-ink">
            <User size={14} strokeWidth={2} />
            Cliente
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Nome completo do cliente</span><input id="cliente_nome"
              name="cliente_nome"
              required
              placeholder="Nome completo"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Telefone do cliente</span><input type="tel" id="cliente_telefone"
                name="cliente_telefone"
                placeholder="Telefone"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">E-mail do cliente (opcional)</span><input id="cliente_email"
                name="cliente_email"
                type="email"
                placeholder="E-mail (opcional)"
                className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
              /></label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="corretor_nome">
              Corretor responsável
            </label>
            <input id="corretor_nome"
              name="corretor_nome"
              placeholder="Nome do corretor"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="data_visita">Data da visita</label>
            <input id="data_visita"
              name="data_visita"
              type="date"
              defaultValue={hoje}
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="multa_percentual">
            Multa por descumprimento (%)
          </label>
          <input id="multa_percentual"
            name="multa_percentual"
            type="number"
            step="0.01"
            defaultValue={6}
            className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`}
          />
          <p className="mt-1 text-[11px] text-ink-muted">
            Percentual cobrado do cliente caso ele feche o negócio por fora, sem a Sacra — 6% é o
            padrão usado no modelo atual.
          </p>
        </div>

        <BotaoSubmit className={`${PRIMARY_BUTTON_CLASS} min-h-11 w-full`}>
          Criar termo de visita
        </BotaoSubmit>
      </form>
    </div>
  );
}
