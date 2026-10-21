import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import {
  CARD_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/styles";
import { BotaoEnviar } from "@/components/botao-enviar";
import { SITUACAO_LABEL } from "@/lib/negociacoes/regras";
import { formatarMoedaBR } from "@/lib/moeda";
import { formatarDataHoraBR } from "@/lib/data-br";
import { acessoNegociacoes, opcoesNegociacoes } from "../dados";
import { FormularioNegociacao } from "../formulario";
import { encerrarNegociacao } from "../actions";

export default async function NegociacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await acessoNegociacoes();
  const [consulta, opcoes, eventos] = await Promise.all([
    s.supabase
      .from("vendas_negociacoes")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", s.tenantId)
      .maybeSingle(),
    opcoesNegociacoes(s.supabase, s.tenantId),
    s.supabase
      .from("vendas_negociacao_eventos")
      .select("id,acao,criado_em,usuarios(nome)")
      .eq("negociacao_id", id)
      .eq("tenant_id", s.tenantId)
      .order("criado_em", { ascending: false }),
  ]);
  if (consulta.error || eventos.error)
    throw new Error(
      "Não foi possível carregar esta negociação. Tente novamente.",
    );
  const n = consulta.data;
  if (!n) notFound();
  return (
    <div className="w-full min-w-0 space-y-6">
      <Link
        href="/vendas/negociacoes"
        className="text-sm text-brand hover:underline"
      >
        ← Negociações de venda
      </Link>
      <CabecalhoPagina
        titulo={n.cliente_nome}
        descricao={`${SITUACAO_LABEL[n.situacao]} · ${n.imovel_endereco}`}
      />
      {n.situacao === "em_andamento" && s.podeEditar ? (
        <FormularioNegociacao
          id={n.id}
          negociacao={n}
          responsaveis={opcoes.responsaveis}
          corretores={opcoes.corretores}
          usuarioId={s.user.id}
        />
      ) : (
        <section className={`${CARD_CLASS} space-y-3 p-5`}>
          <p>
            <strong>Valor da negociação:</strong> {formatarMoedaBR(n.valor)}
          </p>
          <p>
            <strong>Cliente:</strong> {n.cliente_nome}
            {n.telefone ? ` · ${n.telefone}` : ""}
          </p>
          <p>
            <strong>Vendedor:</strong> {n.vendedor_nome || "Não informado"}
          </p>
          <p>
            <strong>Responsável:</strong>{" "}
            {opcoes.responsaveis.find((r) => r.id === n.responsavel_id)?.nome ??
              "Responsável indisponível"}
          </p>
          <p>
            <strong>Corretor:</strong>{" "}
            {opcoes.corretores.find((r) => r.id === n.corretor_id)?.nome ??
              "A definir"}
          </p>
          <p>
            <strong>Abertura:</strong>{" "}
            {n.data_abertura.split("-").reverse().join("/")}
          </p>
          {n.previsao_fechamento && (
            <p>
              <strong>Previsão de fechamento:</strong>{" "}
              {n.previsao_fechamento.split("-").reverse().join("/")}
            </p>
          )}
          {n.proxima_acao && (
            <p>
              <strong>Próxima ação:</strong> {n.proxima_acao}
              {n.data_acompanhamento
                ? ` · ${n.data_acompanhamento.split("-").reverse().join("/")}`
                : ""}
            </p>
          )}
          {n.encerrada_em && (
            <p>
              <strong>Encerramento:</strong>{" "}
              {formatarDataHoraBR(n.encerrada_em)}
            </p>
          )}
          {n.motivo_perda && (
            <p className="text-rose-800">
              <strong>Motivo da perda:</strong> {n.motivo_perda}
            </p>
          )}
          {n.observacoes && (
            <p className="whitespace-pre-wrap break-words">{n.observacoes}</p>
          )}
          {n.processo_id && (
            <Link
              href={`/processos/${n.processo_id}`}
              className={PRIMARY_BUTTON_CLASS}
            >
              Abrir processo de venda →
            </Link>
          )}
        </section>
      )}
      {n.situacao === "em_andamento" && s.podeEditar && (
        <section className="grid gap-4 lg:grid-cols-2">
          <form
            action={encerrarNegociacao}
            className={`${CARD_CLASS} space-y-4 p-5`}
          >
            <h2 className="font-semibold">Fechar venda e criar processo</h2>
            <p className="text-sm text-ink-muted">
              Confira e salve os dados acima antes de fechar. Cliente, vendedor,
              imóvel, valor e responsáveis serão aproveitados no processo ativo,
              com as etapas padrão de Vendas.
            </p>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="versao" value={n.atualizado_em} />
            <input type="hidden" name="situacao" value="convertida" />
            <div>
              <label
                htmlFor="modelo_id"
                className="mb-1.5 block text-sm font-medium"
              >
                Modelo de venda *
              </label>
              <select
                id="modelo_id"
                name="modelo_id"
                required
                className={INPUT_CLASS}
                defaultValue=""
              >
                <option value="">Selecione o modelo</option>
                {opcoes.modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
            {(!n.vendedor_nome.trim() || n.valor <= 0) && (
              <p className="text-sm text-amber-800">
                Preencha e salve o vendedor e um valor de venda maior que zero
                para converter.
              </p>
            )}
            {!opcoes.modelos.length && (
              <p className="text-sm text-amber-800">
                Cadastre um modelo ativo de Vendas em Configurações para
                converter.
              </p>
            )}
            <BotaoEnviar
              disabled={
                !opcoes.modelos.length ||
                !n.vendedor_nome.trim() ||
                n.valor <= 0
              }
              className={PRIMARY_BUTTON_CLASS}
              textoEnviando="Criando processo…"
            >
              Fechar venda e criar processo
            </BotaoEnviar>
          </form>
          <form
            action={encerrarNegociacao}
            className={`${CARD_CLASS} space-y-4 p-5`}
          >
            <h2 className="font-semibold">Registrar perda</h2>
            <p className="text-sm text-ink-muted">
              A negociação sairá das oportunidades em andamento e permanecerá no
              histórico e nas métricas.
            </p>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="versao" value={n.atualizado_em} />
            <input type="hidden" name="situacao" value="perdida" />
            <div>
              <label
                htmlFor="motivo"
                className="mb-1.5 block text-sm font-medium"
              >
                Motivo da perda *
              </label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                required
                maxLength={1000}
                className={INPUT_CLASS}
                placeholder="Ex.: crédito recusado, desistência, proposta não aceita"
              />
            </div>
            <BotaoEnviar
              className={`${SECONDARY_BUTTON_CLASS} text-rose-800`}
              textoEnviando="Registrando…"
            >
              Marcar como perdida
            </BotaoEnviar>
          </form>
        </section>
      )}
      <section className={`${CARD_CLASS} p-5`}>
        <h2 className="font-semibold">Histórico da negociação</h2>
        <ol className="mt-4 space-y-3">
          {eventos.data?.map((e) => (
            <li
              key={e.id}
              className="border-l-2 border-brand-soft pl-3 text-sm"
            >
              <p className="font-medium">{e.acao}</p>
              <p className="mt-1 text-ink-muted">
                {formatarDataHoraBR(e.criado_em)} ·{" "}
                {e.usuarios?.nome ?? "Usuário indisponível"}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
