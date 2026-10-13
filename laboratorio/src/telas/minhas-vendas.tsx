import { useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { Casca } from "../casca";
import { MINHAS_VENDAS, type MinhaVenda } from "../dados";
import { Abas, cx, moeda, PainelLateral, Selo } from "../ui";

const ATUALIZACOES: Record<string, { quando: string; texto: string }[]> = {
  m1: [{ quando: "Hoje", texto: "Cartório informou que a escritura depende do alvará do inventário." }, { quando: "02/10", texto: "Trâmites bancários concluídos." }, { quando: "26/08", texto: "Sinal confirmado." }, { quando: "20/08", texto: "Contrato assinado pelas partes." }],
  m2: [{ quando: "Ontem", texto: "Comprador enviou o contrato assinado." }, { quando: "08/10", texto: "Proposta aceita pelo vendedor." }],
  m3: [{ quando: "08/10", texto: "Escritura lavrada no 2º Ofício." }, { quando: "18/09", texto: "Financiamento aprovado." }],
  m4: [{ quando: "30/09", texto: "Comissão paga." }, { quando: "22/09", texto: "Chaves entregues. Venda concluída." }],
};

export function TelaMinhasVendas() {
  const [aba, setAba] = useState<"vendas" | "comissoes">("vendas");
  const [aberta, setAberta] = useState<MinhaVenda | null>(null);
  const andamento = MINHAS_VENDAS.filter((v) => v.situacao !== "ok");
  const concluidas = MINHAS_VENDAS.filter((v) => v.situacao === "ok");
  const previsto = andamento.reduce((s, v) => s + (v.comissaoPrevista ?? 0), 0);
  const recebido = MINHAS_VENDAS.reduce((s, v) => s + v.comissaoRecebida, 0);
  const semValor = MINHAS_VENDAS.filter((v) => v.comissaoPrevista == null).length;

  const Linha = ({ v }: { v: MinhaVenda }) => (
    <li>
      <button type="button" onClick={() => setAberta(v)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left hover:bg-vidro-2 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_20px] @3xl:px-5">
        <div className="min-w-0">
          <p className="font-medium leading-snug group-hover:underline">{v.imovel}</p>
          <p className="text-[13px] text-chumbo-3">{v.bairro} · <span className="num">{moeda(v.valor)}</span></p>
        </div>
        <div className="col-span-2 row-start-2 min-w-0 @3xl:col-span-1 @3xl:row-start-auto">
          <div className="flex flex-wrap items-center gap-2"><Selo situacao={v.situacao}>{v.quando}</Selo></div>
          <p className="mt-1 text-[13px] text-chumbo-2">{v.etapa}{v.proxima !== "—" && <> · falta: {v.proxima}</>}</p>
        </div>
        <p className={cx("num text-right text-sm font-semibold", v.comissaoPrevista == null && "font-normal text-chumbo-3")}>{v.comissaoPrevista == null ? "sem valor" : moeda(v.comissaoPrevista)}</p>
        <ChevronRight size={18} className="hidden text-chumbo-3 @3xl:block" aria-hidden />
      </button>
    </li>
  );

  return (
    <Casca perfil="corretor" ativo="minhas" usuario="Marina Albuquerque de Sá Figueiredo" titulo="Minhas vendas">
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 @3xl:px-8 @3xl:py-7">
        <h1 className="text-[26px] font-bold leading-tight @3xl:text-[30px]">Minhas vendas</h1>
        <p className="text-chumbo-2">Vendas em que você é a corretora responsável. Atualizado pela equipe da Sacra.</p>

        <div className="caixilho caixilho-forte mt-5 grid-cols-2 @3xl:grid-cols-4">
          <div className="px-4 py-3"><p className="text-[13px] text-chumbo-2">Em andamento</p><p className="num mt-0.5 font-titulo text-[24px] font-bold">{andamento.length}</p></div>
          <div className="px-4 py-3"><p className="text-[13px] text-chumbo-2">Concluídas em 2026</p><p className="num mt-0.5 font-titulo text-[24px] font-bold">{concluidas.length}</p></div>
          <div className="px-4 py-3"><p className="text-[13px] text-chumbo-2">Comissão prevista</p><p className="num mt-0.5 font-titulo text-[24px] font-bold">{moeda(previsto)}</p>{semValor > 0 && <p className="text-[12.5px] text-chumbo-3">+ {semValor} sem valor cadastrado</p>}</div>
          <div className="px-4 py-3"><p className="text-[13px] text-chumbo-2">Recebida em 2026</p><p className="num mt-0.5 font-titulo text-[24px] font-bold text-ok">{moeda(recebido)}</p></div>
        </div>

        <section className="mt-5 border border-chumbo bg-vidro">
          <div className="px-4 @3xl:px-5"><Abas rotulo="Minhas vendas" ativa={aba} onChange={setAba} abas={[{ valor: "vendas", rotulo: "Vendas", contagem: MINHAS_VENDAS.length }, { valor: "comissoes", rotulo: "Comissões" }]} /></div>
          {aba === "vendas" ? (
            <>
              <p className="border-b border-filete bg-vidro-2 px-4 py-2 text-[13px] font-medium text-chumbo-2 @3xl:px-5">Em andamento</p>
              <ul className="divide-y divide-filete">{andamento.map((v) => <Linha key={v.id} v={v} />)}</ul>
              <p className="border-y border-filete bg-vidro-2 px-4 py-2 text-[13px] font-medium text-chumbo-2 @3xl:px-5">Concluídas</p>
              <ul className="divide-y divide-filete">{concluidas.map((v) => <Linha key={v.id} v={v} />)}</ul>
            </>
          ) : (
            <div className="rolagem overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead><tr className="border-b border-filete bg-vidro-2 text-left text-[12.5px] text-chumbo-3"><th className="px-4 py-2 font-medium @3xl:px-5">Imóvel</th><th className="px-3 py-2 text-right font-medium">Prevista</th><th className="px-3 py-2 text-right font-medium">Recebida</th><th className="px-3 py-2 font-medium">Situação</th></tr></thead>
                <tbody className="divide-y divide-filete">
                  {MINHAS_VENDAS.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 @3xl:px-5"><p className="font-medium">{v.imovel}</p><p className="text-[13px] text-chumbo-3">{v.bairro}</p></td>
                      <td className="num px-3 py-3 text-right">{v.comissaoPrevista == null ? <span className="text-chumbo-3">sem valor cadastrado</span> : moeda(v.comissaoPrevista)}</td>
                      <td className="num px-3 py-3 text-right">{moeda(v.comissaoRecebida)}</td>
                      <td className="px-3 py-3">{v.comissaoRecebida > 0 && v.comissaoRecebida === v.comissaoPrevista ? <Selo situacao="ok">Paga</Selo> : v.comissaoPrevista == null ? <Selo situacao="rascunho">A cadastrar</Selo> : <Selo situacao="info">Aguardando a venda</Selo>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="flex gap-2 border-t border-filete px-4 py-3 text-[13px] text-chumbo-2 @3xl:px-5"><Info size={15} className="mt-0.5 shrink-0" aria-hidden />Os valores são os do cadastro da venda. Pagamentos parciais aparecem só quando a equipe registra o pagamento.</p>
            </div>
          )}
        </section>
      </div>

      <PainelLateral aberto={!!aberta} fechar={() => setAberta(null)} titulo={aberta?.imovel ?? ""} subtitulo={aberta && <Selo situacao={aberta.situacao}>{aberta.quando}</Selo>}>
        {aberta && (
          <div className="space-y-5">
            <dl className="caixilho grid-cols-2 text-sm">
              <div className="px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Valor da venda</dt><dd className="num mt-0.5 font-medium">{moeda(aberta.valor)}</dd></div>
              <div className="px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Sua comissão</dt><dd className="num mt-0.5 font-medium">{aberta.comissaoPrevista == null ? "Sem valor cadastrado" : moeda(aberta.comissaoPrevista)}</dd></div>
              <div className="col-span-2 px-3 py-2.5"><dt className="text-[12.5px] text-chumbo-3">Etapa atual</dt><dd className="mt-0.5 font-medium">{aberta.etapa}</dd></div>
            </dl>
            <div>
              <h3 className="text-[15px] font-semibold">Atualizações da equipe</h3>
              <ol className="mt-2 border-l-2 border-filete">
                {(ATUALIZACOES[aberta.id] ?? []).map((a, i) => (
                  <li key={i} className="relative pb-4 pl-4 last:pb-0">
                    <span aria-hidden className={cx("absolute -left-[5px] top-1.5 size-2", i === 0 ? "bg-ouro-luz" : "bg-filete")} />
                    <p className="num text-[12.5px] text-chumbo-3">{a.quando}</p>
                    <p className="text-sm">{a.texto}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </PainelLateral>
    </Casca>
  );
}
