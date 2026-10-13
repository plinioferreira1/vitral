import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cx } from "../ui";

type Direcao = {
  id: string; nome: string; frase: string; conceito: string; referencias: string[];
  traducao: { item: string; texto: string }[]; funciona: string[]; falha: string[]; previa: ReactNode; escolhida?: boolean;
};

/* As prévias são amostras pintadas com as cores de cada direção: valem nos dois temas porque definem o próprio fundo. */
function PreviaCaixilho() {
  const linhas = [["Venda", "#8e2430", 1, 1, 0], ["Financiamento", "#2856a3", 1, 0, 1], ["Locação", "#0f6e66", 0, 1, 1], ["Documentos", "#5d4893", 0, 0, 1]] as const;
  return (
    <div className="h-full bg-[#f2f1ee] p-4 font-texto text-[#221e1d]">
      <p className="font-titulo text-[20px] font-bold leading-tight">Bom dia, Helena.</p>
      <p className="text-[12px] text-[#59524f]">2 atrasadas e 2 vencem hoje.</p>
      <div className="mt-3 border border-[#221e1d] bg-white text-[12px]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] border-b border-[#dcd8d2] bg-[#f8f7f5] text-[#7d7571]"><span className="px-2 py-1">Área</span><span className="border-l border-[#dcd8d2] px-2 py-1">Atrasado</span><span className="border-l border-[#dcd8d2] px-2 py-1">Hoje</span><span className="border-l border-[#dcd8d2] px-2 py-1">7 dias</span></div>
        {linhas.map(([n, c, a, h, s]) => (
          <div key={n} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] border-b border-[#dcd8d2] last:border-0">
            <span className="flex items-center gap-1.5 px-2 py-1.5"><span className="size-2" style={{ background: c }} />{n}</span>
            {[[a, "#fbe6e3", "#b0261c"], [h, "#fbeed8", "#96530a"], [s, "#e5edf9", "#2856a3"]].map(([v, bg, cor], i) => (
              <span key={i} className="border-l border-[#dcd8d2] px-2 py-1.5 font-titulo font-bold" style={{ background: v ? (bg as string) : undefined, color: v ? (cor as string) : "#dcd8d2" }}>{v || "·"}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2"><span className="bg-[#7b1e24] px-2.5 py-1.5 text-[12px] font-medium text-white">Registrar escritura</span><span className="border border-[#221e1d] bg-white px-2.5 py-1.5 text-[12px]">Ver processo</span></div>
    </div>
  );
}

function PreviaCartorio() {
  return (
    <div className="h-full bg-[#f6f0e3] p-4 font-documento text-[#2b211b]" style={{ backgroundImage: "repeating-linear-gradient(#f6f0e3 0 23px, #e3d6bd 23px 24px)" }}>
      <div className="flex items-baseline justify-between border-b-2 border-double border-[#2b211b] pb-1"><p className="text-[20px] font-semibold italic">Livro do dia</p><p className="text-[12px]">13 · X · 2026</p></div>
      <ol className="mt-1 text-[14px] leading-[24px]">
        {[["Escritura + intermediária", "SQN 312 K 504", "vencida"], ["Reanálise da proposta", "Parque das Águas", "vencida"], ["IPTU/TLP de outubro", "CLN 205 B loja 12", "hoje"], ["Pagamento do sinal", "Park Way Q.26", "hoje"]].map(([t, c, s], i) => (
          <li key={t} className="flex items-baseline gap-2"><span className="w-5 text-[12px] text-[#7a6450]">{i + 1}.</span><span className="flex-1 truncate">{t} <span className="text-[12px] italic text-[#7a6450]">— {c}</span></span>
            {s === "vencida" ? <span className="rotate-[-4deg] border-2 border-[#8c1d22] px-1 font-texto text-[10px] font-bold uppercase tracking-wider text-[#8c1d22]">Vencida</span> : <span className="font-texto text-[11px] font-semibold text-[#8a5d0e]">hoje</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-right text-[12px] italic text-[#7a6450]">Conferido por H. D. Vasconcelos</p>
    </div>
  );
}

function PreviaSuperquadra() {
  return (
    <div className="grid h-full grid-cols-2 gap-1.5 bg-[#ece6da] p-3 font-titulo text-white">
      <div className="relative overflow-hidden bg-[#c2372d] p-3"><span className="absolute -right-3 -top-3 size-14 rounded-full bg-white/15" /><p className="text-[12px] font-semibold opacity-90">Atrasado</p><p className="text-[44px] font-black leading-none">2</p></div>
      <div className="relative overflow-hidden bg-[#f0b23a] p-3 text-[#2b211b]"><span className="absolute -bottom-4 -left-4 size-12 rotate-45 bg-black/10" /><p className="text-[12px] font-semibold">Hoje</p><p className="text-[44px] font-black leading-none">2</p></div>
      <div className="relative overflow-hidden bg-[#1d5fa8] p-3"><span className="absolute right-2 top-2 h-8 w-4 bg-white/20" /><p className="text-[12px] font-semibold opacity-90">Financiamento</p><p className="text-[30px] font-black leading-none">3</p></div>
      <div className="relative overflow-hidden bg-[#0f7a6e] p-3"><span className="absolute -right-2 bottom-2 size-8 rounded-full border-4 border-white/25" /><p className="text-[12px] font-semibold opacity-90">Locação</p><p className="text-[30px] font-black leading-none">2</p></div>
      <div className="col-span-2 flex items-center justify-between bg-[#2b211b] px-3 py-2 text-[13px]"><span>VGV 2026</span><span className="font-black">R$ 31,5 mi · 75%</span></div>
    </div>
  );
}

const DIRECOES: Direcao[] = [
  {
    id: "caixilho", nome: "Caixilho", frase: "Estrutura de chumbo, luz só onde informa.", escolhida: true,
    conceito: "A interface é a armação do vitral: painéis brancos encostados, separados por filetes finos, sem cartões flutuantes nem sombras. A cor entra em vidros pequenos e precisos — a cor da área (como a linha de um metrô) e a cor da situação do prazo.",
    referencias: ["Vitrais de Marianne Peretti na Catedral de Brasília: cor dentro de uma estrutura rígida.", "Otl Aicher e Massimo Vignelli: uma cor por área, sempre a mesma, em todo o sistema.", "Josef Albers, A interação da cor: pouca cor parece mais intensa ao lado de neutros.", "Endereçamento de Brasília (quadra, bloco, unidade): leitura em grade."],
    traducao: [
      { item: "Cores", texto: "Cal (#f2f1ee), vidro branco, chumbo (#221e1d). Bordô da Sacra só na ação principal; dourado como luz (destaque, nunca texto). Seis vidros de área e quatro de situação." },
      { item: "Tipografia", texto: "Gabarito (fundição brasileira) nos títulos; Archivo para interface e números tabulares; Newsreader nos documentos ao cliente." },
      { item: "Composição", texto: "Grades com bordas compartilhadas; tabelas e listas antes de cartões. Largura toda no computador, uma coluna no celular." },
      { item: "Componentes", texto: "Cantos retos, botões firmes, selo com ícone e palavra, detalhe em painel lateral." },
      { item: "Movimento", texto: "Curto (120–200 ms) e só em resposta: abrir, confirmar, acender o valor que mudou." },
    ],
    funciona: ["Aguenta muita informação sem parecer pesado.", "A identidade nasce do próprio nome, não de enfeite.", "Fácil de aplicar em módulos novos: as regras são poucas."],
    falha: ["Pode parecer sóbrio demais em telas vazias; depende de bons estados vazios.", "Exige disciplina: se cada módulo inventar uma cor, o sistema perde o sentido."],
    previa: <PreviaCaixilho />,
  },
  {
    id: "cartorio", nome: "Cartório", frase: "O livro de registro, conferido e carimbado.",
    conceito: "Inspirada nos livros de notas e nos registros de imóveis: papel creme, linhas de pauta, serifada em tudo, carimbos para situação. Transmite cuidado documental e permanência — a ideia de que cada passo fica registrado.",
    referencias: ["Livros de notas e matrículas de cartório.", "Jornais de referência e sua hierarquia tipográfica.", "Carimbos “conferido”, “vencida”, “pago”."],
    traducao: [
      { item: "Cores", texto: "Papel (#f6f0e3), tinta sépia, bordô de carimbo e dourado envelhecido." },
      { item: "Tipografia", texto: "Serifada (Newsreader) na interface inteira, itálico para contexto." },
      { item: "Composição", texto: "Colunas de livro, pauta, numeração de folhas." },
      { item: "Componentes", texto: "Selos como carimbos inclinados; tabelas como livros-razão." },
      { item: "Movimento", texto: "Quase nenhum: a página “vira”." },
    ],
    funciona: ["Muito forte nos documentos ao cliente e nos termos.", "Combina com o rigor de avaliação, registro e assinatura."],
    falha: ["Na operação diária, parece antigo e lento.", "Serifada em tabelas densas e no celular cansa.", "Carimbo inclinado é difícil de manter acessível."],
    previa: <PreviaCartorio />,
  },
  {
    id: "superquadra", nome: "Superquadra", frase: "Painéis de cor e números grandes, como azulejos.",
    conceito: "Inspirada nos painéis de azulejo de Athos Bulcão e nas cores da sinalização da cidade: blocos de cor plena, formas geométricas, números enormes. Cada área é um painel; o dia vira um mural de contagens.",
    referencias: ["Painéis de Athos Bulcão (Itamaraty, Brasília Palace).", "Sinalização por cor de aeroportos e metrôs.", "Painéis de indicadores com números grandes."],
    traducao: [
      { item: "Cores", texto: "Vermelho, amarelo, azul e verde plenos, sobre fundo areia." },
      { item: "Tipografia", texto: "Gabarito Black em números gigantes; Archivo no restante." },
      { item: "Composição", texto: "Mosaico de blocos de tamanhos diferentes." },
      { item: "Componentes", texto: "Blocos de indicador grandes, cantos retos com formas recortadas." },
      { item: "Movimento", texto: "Contagens animadas e entrada dos blocos." },
    ],
    funciona: ["Muito memorável e alegre; lembra Brasília imediatamente.", "Ótimo para TV da sala, Resultados e metas."],
    falha: ["Cor plena em toda parte compete com a cor de alerta.", "Cansa em uso de oito horas; tabelas ficam sem lugar.", "Números grandes ocupam a tela do celular sem dizer o que fazer."],
    previa: <PreviaSuperquadra />,
  },
];

const CRITERIOS: { nome: string; notas: [string, string, string] }[] = [
  { nome: "Leitura de muita informação", notas: ["Ótima", "Média", "Fraca"] },
  { nome: "Uso no celular", notas: ["Ótimo", "Fraco", "Médio"] },
  { nome: "Identidade própria", notas: ["Boa", "Boa", "Ótima"] },
  { nome: "Cansaço em uso diário", notas: ["Baixo", "Médio", "Alto"] },
  { nome: "Documentos ao cliente", notas: ["Bom", "Ótimo", "Fraco"] },
  { nome: "Esforço para implantar", notas: ["Médio", "Médio", "Alto"] },
];

export function PaginaDirecoes() {
  return (
    <div className="space-y-12">
      <header className="max-w-[72ch]">
        <h1 className="text-[32px] font-bold leading-tight">Três direções</h1>
        <p className="mt-2 text-[17px] text-chumbo-2">Três caminhos de fato diferentes para a mesma tela de Início. A recomendação é o Caixilho, levando dele para os documentos o melhor do Cartório. A opção de ficar com o visual genérico de painel (cartões com sombra, cores aleatórias) foi descartada: é o que o Vitral já tem e não diz nada sobre a Sacra.</p>
      </header>

      {DIRECOES.map((d, i) => (
        <section key={d.id} id={`direcao-${d.id}`} className={cx("border bg-vidro", d.escolhida ? "border-chumbo" : "border-filete")}>
          <div className="grid @5xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 px-5 py-5 @3xl:px-7 @3xl:py-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num font-titulo text-[15px] font-bold text-chumbo-3">{["A", "B", "C"][i]}</span>
                {d.escolhida && <span className="inline-flex h-6 items-center gap-1 bg-ouro-vidro px-2 text-[12.5px] font-semibold text-ouro"><CheckCircle2 size={13} aria-hidden />Recomendada</span>}
              </div>
              <h2 className="mt-1 text-[30px] font-bold leading-none">{d.nome}</h2>
              <p className="mt-1.5 text-[17px] font-medium text-chumbo-2">{d.frase}</p>
              <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.6]">{d.conceito}</p>
              <h3 className="mt-5 text-[15px] font-semibold">Referências</h3>
              <ul className="mt-1.5 space-y-1 text-[14px] text-chumbo-2">{d.referencias.map((r) => <li key={r} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 bg-chumbo-3" />{r}</li>)}</ul>
            </div>
            <div className="min-h-[260px] border-t border-filete @5xl:border-l @5xl:border-t-0" aria-label={`Prévia da direção ${d.nome}`} role="img">{d.previa}</div>
          </div>
          <dl className="grid gap-px border-t border-filete bg-filete @3xl:grid-cols-5">
            {d.traducao.map((t) => <div key={t.item} className="bg-vidro px-5 py-3"><dt className="text-[13px] font-semibold">{t.item}</dt><dd className="mt-0.5 text-[13.5px] text-chumbo-2">{t.texto}</dd></div>)}
          </dl>
          <div className="grid gap-px border-t border-filete bg-filete @3xl:grid-cols-2">
            <div className="bg-vidro px-5 py-4"><h3 className="text-[15px] font-semibold text-ok">Por que funciona</h3><ul className="mt-1.5 space-y-1 text-[14px]">{d.funciona.map((t) => <li key={t}>{t}</li>)}</ul></div>
            <div className="bg-vidro px-5 py-4"><h3 className="text-[15px] font-semibold text-critico">Onde falha</h3><ul className="mt-1.5 space-y-1 text-[14px]">{d.falha.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-[24px] font-bold">Comparação</h2>
        <div className="rolagem mt-3 overflow-x-auto border border-chumbo bg-vidro">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead><tr className="border-b border-chumbo text-left"><th className="px-4 py-2.5 font-medium text-chumbo-3">Critério</th>{DIRECOES.map((d) => <th key={d.id} className={cx("border-l border-filete px-4 py-2.5 font-titulo text-[15px] font-semibold", d.escolhida && "bg-ouro-vidro")}>{d.nome}</th>)}</tr></thead>
            <tbody className="divide-y divide-filete">{CRITERIOS.map((c) => <tr key={c.nome}><th scope="row" className="px-4 py-2.5 text-left font-medium">{c.nome}</th>{c.notas.map((n, i) => <td key={i} className={cx("border-l border-filete px-4 py-2.5", DIRECOES[i].escolhida && "bg-ouro-vidro/60", ["Ótima", "Ótimo", "Baixo"].includes(n) && "font-semibold")}>{n}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[72ch] text-chumbo-2"><strong className="text-chumbo">Recomendação:</strong> Caixilho em todo o sistema, com a serifada e o rigor do Cartório nos documentos ao cliente (relatório, termos, laudos), e os números grandes da Superquadra apenas em Resultados e numa futura tela para a TV da sala.</p>
      </section>
    </div>
  );
}
