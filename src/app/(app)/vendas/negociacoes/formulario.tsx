import type { Negociacao } from "@/lib/negociacoes/regras";
import { hojeISO } from "@/lib/data-br";
import { BotaoEnviar } from "@/components/botao-enviar";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  CARD_CLASS,
} from "@/components/ui/styles";
import { salvarNegociacao } from "./actions";
import type { ReactNode } from "react";

function Campo({
  nome,
  titulo,
  children,
}: {
  nome: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={nome} className="block text-sm font-medium text-ink">
        {titulo}
      </label>
      {children}
    </div>
  );
}
export function FormularioNegociacao({
  id,
  negociacao: n,
  responsaveis,
  corretores,
  usuarioId,
}: {
  id: string;
  negociacao?: Negociacao;
  responsaveis: { id: string; nome: string }[];
  corretores: { id: string; nome: string }[];
  usuarioId: string;
}) {
  return (
    <form action={salvarNegociacao} className={`${CARD_CLASS} space-y-6 p-5`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="versao" value={n?.atualizado_em ?? ""} />
      <div>
        <h2 className="font-semibold text-ink">Cliente e imóvel</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Registre a oportunidade e complete os dados conforme a negociação
          avançar.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Campo nome="cliente_nome" titulo="Cliente / comprador *">
          <input
            id="cliente_nome"
            name="cliente_nome"
            required
            maxLength={200}
            defaultValue={n?.cliente_nome}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo nome="telefone" titulo="Telefone">
          <input
            id="telefone"
            name="telefone"
            type="tel"
            maxLength={40}
            defaultValue={n?.telefone}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo nome="vendedor_nome" titulo="Vendedor">
          <input
            id="vendedor_nome"
            name="vendedor_nome"
            maxLength={200}
            defaultValue={n?.vendedor_nome}
            className={INPUT_CLASS}
          />
        </Campo>
        <div className="md:col-span-2">
          <Campo nome="imovel_endereco" titulo="Imóvel / endereço *">
            <input
              id="imovel_endereco"
              name="imovel_endereco"
              required
              maxLength={500}
              defaultValue={n?.imovel_endereco}
              className={INPUT_CLASS}
            />
          </Campo>
        </div>
        <Campo nome="valor" titulo="Valor da negociação (R$)">
          <input
            id="valor"
            name="valor"
            type="number"
            min="0"
            max="999999999999.99"
            step="0.01"
            defaultValue={n?.valor ?? 0}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo nome="corretor_id" titulo="Corretor">
          <select
            id="corretor_id"
            name="corretor_id"
            defaultValue={n?.corretor_id ?? ""}
            className={INPUT_CLASS}
          >
            <option value="">A definir</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="responsavel_id" titulo="Responsável pelo acompanhamento *">
          <select
            id="responsavel_id"
            name="responsavel_id"
            required
            defaultValue={n?.responsavel_id ?? usuarioId}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="data_abertura" titulo="Data de abertura *">
          <input
            id="data_abertura"
            name="data_abertura"
            type="date"
            required
            max={hojeISO()}
            defaultValue={n?.data_abertura ?? hojeISO()}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo nome="previsao_fechamento" titulo="Previsão de fechamento">
          <input
            id="previsao_fechamento"
            name="previsao_fechamento"
            type="date"
            defaultValue={n?.previsao_fechamento ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo nome="proxima_acao" titulo="Próxima ação">
          <input
            id="proxima_acao"
            name="proxima_acao"
            maxLength={500}
            defaultValue={n?.proxima_acao}
            placeholder="Ex.: retorno sobre a proposta"
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo
          nome="data_acompanhamento"
          titulo="Data do próximo acompanhamento"
        >
          <input
            id="data_acompanhamento"
            name="data_acompanhamento"
            type="date"
            defaultValue={n?.data_acompanhamento ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
      </div>
      <Campo nome="observacoes" titulo="Observações">
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={10000}
          rows={4}
          defaultValue={n?.observacoes}
          className={INPUT_CLASS}
        />
      </Campo>
      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…">
        Salvar negociação
      </BotaoEnviar>
    </form>
  );
}
