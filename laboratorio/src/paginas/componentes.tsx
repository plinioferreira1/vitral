import { useState, type ReactNode } from "react";
import { Copy, Download, FileText, Inbox, MoreHorizontal, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Abas, Alternador, BlocoErro, Botao, Caixa, Campo, Chip, cx, Dialogo, LinhasEsqueleto, Menu, PainelLateral, Segmentado, Selecao, Selo, useAviso, Vazio, VidroArea, type Area } from "../ui";

function Bloco({ titulo, descricao, children, className }: { titulo: string; descricao?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 border border-chumbo bg-vidro", className)}>
      <div className="border-b border-filete px-5 py-3"><h2 className="text-[17px] font-semibold">{titulo}</h2>{descricao && <p className="text-[13px] text-chumbo-3">{descricao}</p>}</div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function PaginaComponentes({ semMovimento, setSemMovimento }: { semMovimento: boolean; setSemMovimento: (v: boolean) => void }) {
  const avisar = useAviso();
  const [salvando, setSalvando] = useState(false);
  const [seg, setSeg] = useState<"mes" | "tri" | "ano">("mes");
  const [lig, setLig] = useState(true);
  const [cx1, setCx1] = useState(true);
  const [cx2, setCx2] = useState(false);
  const [chip, setChip] = useState("todos");
  const [aba, setAba] = useState<"a" | "b" | "c">("a");
  const [dialogo, setDialogo] = useState(false);
  const [painel, setPainel] = useState(false);
  const [estado, setEstado] = useState<"vazio" | "carregando" | "erro">("vazio");
  const [valor, setValor] = useState("");

  return (
    <div className="space-y-6">
      <header className="max-w-[72ch]"><h1 className="text-[32px] font-bold leading-tight">Componentes</h1><p className="mt-2 text-[17px] text-chumbo-2">Cada componente com seus estados. São os mesmos usados nas telas; tudo aqui responde ao toque e ao teclado.</p></header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @5xl:grid-cols-2">
        <Bloco titulo="Botões" descricao="Um principal por área da tela. Rótulo diz exatamente o que acontece.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><Botao variante="principal" icone={Save}>Salvar despesa</Botao><Botao icone={Download}>Baixar PDF</Botao><Botao variante="discreto">Cancelar</Botao><Botao variante="perigo" icone={Trash2}>Excluir</Botao></div>
            <div className="flex flex-wrap gap-2"><Botao variante="principal" disabled>Desabilitado</Botao><Botao disabled>Desabilitado</Botao><Botao variante="principal" carregando={salvando} onClick={() => { setSalvando(true); setTimeout(() => { setSalvando(false); avisar({ tipo: "ok", texto: "Despesa salva." }); }, 1200); }}>{salvando ? "Salvando…" : "Testar “Salvando…”"}</Botao></div>
            <div className="flex flex-wrap items-center gap-2"><Botao tamanho="p" variante="principal" icone={Plus}>Pequeno</Botao><Botao tamanho="p">Pequeno</Botao><Menu rotulo="Mais ações" gatilho={<MoreHorizontal size={18} />} itens={[{ rotulo: "Editar", icone: Pencil, acao: () => avisar({ tipo: "info", texto: "Editar" }) }, { rotulo: "Duplicar", icone: Copy, acao: () => avisar({ tipo: "info", texto: "Duplicar" }) }, { rotulo: "Excluir", icone: Trash2, perigo: true, acao: () => setDialogo(true) }]} /><span className="text-[13px] text-chumbo-3">← menu (setas e Esc)</span></div>
          </div>
        </Bloco>

        <Bloco titulo="Campos" descricao="Rótulo sempre visível; ajuda e erro abaixo do campo.">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Campo rotulo="Descrição" placeholder="Ex.: Condomínio de outubro" />
            <Campo rotulo="Valor" prefixo="R$" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} erro={valor && !/^[\d.,]+$/.test(valor) ? "Use só números, ponto e vírgula." : undefined} ajuda="Digite letras para ver o erro." />
            <Campo rotulo="Observação" opcional placeholder="Aparece no histórico" />
            <Campo rotulo="Área" sufixo="m²" defaultValue="56,06" disabled />
            <Selecao rotulo="Conta" opcoes={[{ valor: "i", rotulo: "Inter — conta corrente" }, { valor: "s", rotulo: "Sicoob — conta corrente" }]} />
            <Campo rotulo="Vencimento" type="date" defaultValue="2026-10-20" />
          </div>
        </Bloco>

        <Bloco titulo="Seletores" descricao="Segmentado para 2 a 5 opções; lista suspensa só para mais que isso.">
          <div className="space-y-5">
            <Segmentado rotulo="Período" valor={seg} onChange={setSeg} opcoes={[{ valor: "mes", rotulo: "Mês" }, { valor: "tri", rotulo: "Trimestre" }, { valor: "ano", rotulo: "Ano" }]} />
            <Alternador rotulo="Lembrar por e-mail no dia do vencimento" descricao="O responsável recebe às 8h." ligado={lig} onChange={setLig} />
            <Alternador rotulo="Movimento reduzido no laboratório" descricao="O mesmo efeito da preferência do sistema." ligado={semMovimento} onChange={setSemMovimento} />
            <div className="flex flex-wrap gap-6"><Caixa rotuloVisivel rotulo="Marcado" marcado={cx1} onChange={setCx1} /><Caixa rotuloVisivel rotulo="Desmarcado" marcado={cx2} onChange={setCx2} /><Caixa rotuloVisivel rotulo="Parcial" marcado={false} misto onChange={() => {}} /></div>
            <div className="rolagem -mx-1 flex gap-2 overflow-x-auto px-1">{[["todos", "Todos", 10], ["vencidos", "Vencidos", 1], ["hoje", "Hoje", 2], ["pagos", "Pagos", 2]].map(([v, r, n]) => <Chip key={v as string} ativo={chip === v} contagem={n as number} onClick={() => setChip(v as string)}>{r}</Chip>)}</div>
          </div>
        </Bloco>

        <Bloco titulo="Situação e área" descricao="Situação: ícone + palavra. Área: vidro de cor + nome.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><Selo situacao="ok">Pago</Selo><Selo situacao="hoje">Vence hoje</Selo><Selo situacao="atencao">Revisar</Selo><Selo situacao="atrasado">3 dias de atraso</Selo><Selo situacao="info">Em 2 dias</Selo><Selo situacao="rascunho">Rascunho</Selo></div>
            <div className="flex flex-wrap gap-4">{(["venda", "financiamento", "locacao", "financeiro", "documentos", "pessoas"] as Area[]).map((a) => <VidroArea key={a} area={a} />)}</div>
          </div>
        </Bloco>

        <Bloco titulo="Abas" descricao="Setas esquerda e direita trocam de aba.">
          <Abas rotulo="Exemplo" ativa={aba} onChange={setAba} abas={[{ valor: "a", rotulo: "Etapas", contagem: 7 }, { valor: "b", rotulo: "Documentos", contagem: 4 }, { valor: "c", rotulo: "Histórico" }]} />
          <p className="pt-4 text-sm text-chumbo-2">{aba === "a" ? "Conteúdo das etapas." : aba === "b" ? "Conteúdo dos documentos." : "Conteúdo do histórico."}</p>
        </Bloco>

        <Bloco titulo="Diálogo, painel e avisos" descricao="Diálogo para confirmar; painel lateral para detalhe; aviso com Desfazer.">
          <div className="flex flex-wrap gap-2">
            <Botao variante="perigo" icone={Trash2} onClick={() => setDialogo(true)}>Excluir lançamento</Botao>
            <Botao icone={FileText} onClick={() => setPainel(true)}>Abrir detalhe</Botao>
            <Botao onClick={() => avisar({ tipo: "ok", texto: "Baixa registrada em 3 lançamentos.", desfazer: () => avisar({ tipo: "info", texto: "Baixa desfeita." }) })}>Aviso com desfazer</Botao>
            <Botao onClick={() => avisar({ tipo: "erro", texto: "Não foi possível salvar: a conexão caiu. Tente de novo." })}>Aviso de erro</Botao>
          </div>
        </Bloco>

        <Bloco titulo="Estados de uma lista" descricao="Vazio convida a agir; carregando mostra a forma; erro diz o que houve e como seguir." className="@5xl:col-span-2">
          <div className="mb-4 max-w-sm"><Segmentado rotulo="Estado" oculto valor={estado} onChange={setEstado} opcoes={[{ valor: "vazio", rotulo: "Vazio" }, { valor: "carregando", rotulo: "Carregando" }, { valor: "erro", rotulo: "Erro" }]} /></div>
          <div className="border border-filete">
            {estado === "vazio" ? <Vazio icone={Inbox} titulo="Nenhuma despesa em outubro" texto="Cadastre a primeira despesa do mês ou importe o extrato do banco." acao={<Botao tamanho="p" variante="principal" icone={Plus}>Nova despesa</Botao>} />
              : estado === "carregando" ? <LinhasEsqueleto />
              : <div className="p-4"><BlocoErro titulo="Não foi possível carregar as despesas" texto="O servidor demorou mais de 10 segundos para responder. Nada foi alterado." acao={<Botao tamanho="p" icone={RefreshCw} onClick={() => setEstado("vazio")}>Tentar de novo</Botao>} /></div>}
          </div>
        </Bloco>
      </div>

      <Dialogo aberto={dialogo} fechar={() => setDialogo(false)} titulo="Excluir este lançamento?" acoes={<><Botao onClick={() => setDialogo(false)}>Cancelar</Botao><Botao variante="perigo" icone={Trash2} onClick={() => { setDialogo(false); avisar({ tipo: "ok", texto: "Lançamento excluído.", desfazer: () => avisar({ tipo: "info", texto: "Exclusão desfeita." }) }); }}>Excluir</Botao></>}>
        “Condomínio — Graúna 1601B”, R$ 1.938,96, vencido em 10/10. A baixa e o anexo também serão removidos.
      </Dialogo>
      <PainelLateral aberto={painel} fechar={() => setPainel(false)} titulo="Seguro incêndio Yellum" subtitulo={<Selo situacao="rascunho">A vencer em 14/10</Selo>} rodape={<><Botao onClick={() => setPainel(false)}>Fechar</Botao><Botao variante="principal" onClick={() => { setPainel(false); avisar({ tipo: "ok", texto: "Baixa registrada." }); }}>Dar baixa</Botao></>}>
        <p className="text-sm text-chumbo-2">O detalhe abre ao lado, sem perder a lista. No celular, ocupa a tela inteira. Esc ou toque fora fecha.</p>
      </PainelLateral>
    </div>
  );
}
