import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: propostaRaw } = await supabase
    .from("cartas_proposta")
    .select(
      "*, imoveis ( endereco ), proponente:clientes!cartas_proposta_proponente_id_fkey ( nome, cpf_cnpj ), segundo_proponente:clientes!cartas_proposta_segundo_proponente_id_fkey ( nome, cpf_cnpj )"
    )
    .eq("id", id)
    .single();

  if (!propostaRaw) {
    return new Response("Proposta não encontrada", { status: 404 });
  }

  const p = propostaRaw as unknown as {
    id: string;
    status: string;
    valor_total: number | null;
    prazo_dias_validade: number | null;
    observacoes: string | null;
    criado_em: string;
    imoveis: { endereco: string } | null;
    proponente: { nome: string; cpf_cnpj: string | null } | null;
    segundo_proponente: { nome: string; cpf_cnpj: string | null } | null;
  };

  if (p.status !== "assinado") {
    return new Response("Essa proposta ainda não foi assinada.", { status: 400 });
  }

  const { data: condicoes } = await supabase
    .from("carta_proposta_condicoes")
    .select("descricao, valor")
    .eq("carta_proposta_id", id)
    .order("ordem", { ascending: true });

  const { data: signatarios } = await supabase
    .from("carta_proposta_signatarios")
    .select("nome_esperado, nome_digitado, assinatura_imagem, assinado_em, ip_assinatura, ordem")
    .eq("carta_proposta_id", id)
    .order("ordem", { ascending: true });

  // ---- monta o PDF ----
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await doc.embedFont(StandardFonts.HelveticaBold);

  const MARGEM = 56;
  const LARGURA_PAGINA = 595.28; // A4
  const ALTURA_PAGINA = 841.89;
  const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;

  let pagina = doc.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
  let y = ALTURA_PAGINA - MARGEM;

  function novaPaginaSeNecessario(alturaNecessaria: number) {
    if (y - alturaNecessaria < MARGEM) {
      pagina = doc.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
      y = ALTURA_PAGINA - MARGEM;
    }
  }

  function quebrarLinhas(texto: string, tamanho: number, negrito = false): string[] {
    const f = negrito ? fonteNegrito : fonte;
    const palavras = texto.split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (f.widthOfTextAtSize(teste, tamanho) > LARGURA_UTIL && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function escreverParagrafo(texto: string, opcoes?: { tamanho?: number; negrito?: boolean; espacoDepois?: number; centralizado?: boolean }) {
    const tamanho = opcoes?.tamanho ?? 10.5;
    const negrito = opcoes?.negrito ?? false;
    const f = negrito ? fonteNegrito : fonte;
    const linhas = quebrarLinhas(texto, tamanho, negrito);
    for (const linha of linhas) {
      novaPaginaSeNecessario(tamanho + 4);
      const larguraLinha = f.widthOfTextAtSize(linha, tamanho);
      const x = opcoes?.centralizado ? MARGEM + (LARGURA_UTIL - larguraLinha) / 2 : MARGEM;
      pagina.drawText(linha, { x, y, size: tamanho, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= tamanho + 4;
    }
    y -= opcoes?.espacoDepois ?? 6;
  }

  escreverParagrafo("CARTA DE PROPOSTA DE COMPRA DE IMÓVEL", {
    tamanho: 13,
    negrito: true,
    centralizado: true,
    espacoDepois: 16,
  });

  escreverParagrafo("À");
  escreverParagrafo("Sacra Imóveis", { espacoDepois: 12 });

  escreverParagrafo(`Ref.: Proposta de compra – ${p.imoveis?.endereco ?? "—"}`, { espacoDepois: 12 });

  const nomeProponente = p.proponente?.nome ?? "—";
  const cpfProponente = p.proponente?.cpf_cnpj ? `, inscrito(a) no CPF ${p.proponente.cpf_cnpj}` : "";
  const segundo = p.segundo_proponente?.nome
    ? `, em conjunto com ${p.segundo_proponente.nome}${
        p.segundo_proponente.cpf_cnpj ? `, inscrito(a) no CPF ${p.segundo_proponente.cpf_cnpj}` : ""
      }`
    : "";

  escreverParagrafo(
    `Eu, ${nomeProponente}${cpfProponente}${segundo}, venho, por meio desta, formalizar proposta de compra do imóvel localizado em ${
      p.imoveis?.endereco ?? "—"
    }, pelo valor total de ${brl(p.valor_total)}, nas seguintes condições de pagamento:`,
    { espacoDepois: 10 }
  );

  for (const c of condicoes ?? []) {
    escreverParagrafo(`•  ${c.descricao} — ${brl(c.valor)}`, { espacoDepois: 4 });
  }
  y -= 6;

  escreverParagrafo(
    `A presente proposta é válida pelo prazo de ${p.prazo_dias_validade ?? "—"} (${
      p.prazo_dias_validade ?? "—"
    }) dias úteis, contados a partir da data desta carta.`,
    { espacoDepois: 10 }
  );

  escreverParagrafo(
    "Declaro estar ciente de que esta proposta está sujeita à aceitação do proprietário e, se for o caso, à aprovação de crédito junto à instituição financeira responsável pelo financiamento.",
    { espacoDepois: 10 }
  );

  escreverParagrafo(
    "Coloco-me à disposição para quaisquer esclarecimentos e para formalização dos trâmites necessários à efetivação da compra, caso a proposta seja aceita.",
    { espacoDepois: 10 }
  );

  if (p.observacoes) {
    escreverParagrafo(`Observações: ${p.observacoes}`, { espacoDepois: 10 });
  }

  escreverParagrafo(
    "A presente proposta, sendo assinada eletronicamente pelas partes por meio de assinatura eletrônica simples (identificação por nome declarado, assinatura manuscrita digitalizada, data, hora e endereço IP de acesso registrados no momento da assinatura), possui validade jurídica nos termos do art. 10, §2º, da MP 2.200-2/2001, que reconhece a validade de assinaturas eletrônicas entre partes que consintam em utilizá-las como meio de prova.",
    { tamanho: 9, espacoDepois: 16 }
  );

  escreverParagrafo(`Brasília, ${dataExtenso(p.criado_em)}.`, { espacoDepois: 24 });

  // ---- assinaturas ----
  for (const s of signatarios ?? []) {
    novaPaginaSeNecessario(120);

    if (s.assinatura_imagem) {
      try {
        const base64 = s.assinatura_imagem.split(",")[1] ?? s.assinatura_imagem;
        const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
        const imagem = await doc.embedPng(bytes);
        const larguraImg = 180;
        const alturaImg = (imagem.height / imagem.width) * larguraImg;
        pagina.drawImage(imagem, { x: MARGEM, y: y - alturaImg, width: larguraImg, height: alturaImg });
        y -= alturaImg + 4;
      } catch {
        // se a imagem não puder ser decodificada, segue sem ela
      }
    }

    pagina.drawLine({
      start: { x: MARGEM, y },
      end: { x: MARGEM + 220, y },
      thickness: 0.75,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;

    escreverParagrafo((s.nome_digitado ?? "—").toUpperCase(), { tamanho: 9.5, negrito: true, espacoDepois: 2 });
    escreverParagrafo(s.nome_esperado, { tamanho: 8.5, espacoDepois: 2 });
    if (s.assinado_em) {
      escreverParagrafo(
        `Assinado eletronicamente em ${new Date(s.assinado_em).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}${s.ip_assinatura ? ` · IP ${s.ip_assinatura}` : ""}`,
        { tamanho: 7.5, espacoDepois: 16 }
      );
    }
  }

  escreverParagrafo("Representado por: Sacra Imóveis", { tamanho: 9.5, espacoDepois: 0 });

  const pdfBytes = await doc.save();

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="carta-proposta-${id}.pdf"`,
    },
  });
}
