import type { Topico } from "./topicos";

/** Guias, modelos e documentos fixos da Central de ajuda (antes em materiais-corretor.tsx). */

const MENSAGEM_PORTEIRO = `Olá! Sou [seu nome], corretor(a) na Sacra Netimóveis (CRECI [seu CRECI]), e gostaria de propor uma parceria que pode trazer benefícios pra todos.

Atuamos na compra, venda e locação de imóveis, e tenho clientes interessados em apartamentos nesse condomínio e região.

Caso você consiga me indicar o contato de algum proprietário que esteja vendendo ou alugando — mesmo que já esteja sendo trabalhado por corretor de outra imobiliária — posso realizar a captação e conduzir a negociação. Em caso de negócio fechado, acertamos uma comissão pela indicação.

O que acha de conversarmos melhor sobre essa possibilidade?

[seu telefone]
[seu e-mail]`;

const MENSAGEM_IMOVEL_SEGURO = `Olá, [nome do proprietário], boa tarde!

Gostaria de incluir o seu imóvel [endereço], no Programa Imóvel Seguro do DF Imóveis, para que ele tenha maior visibilidade no portal.

Ao realizar uma pesquisa no site, o(a) senhor(a) poderá notar que os imóveis com o selo Imóvel Seguro aparecem com destaque e nas primeiras posições dos resultados.

Para obtenção desse selo, é necessário que a documentação do imóvel seja enviada ao cartório, confirmando que está tudo regular. Isso também facilita e agiliza o processo de venda quando surgir uma proposta.

As despesas desse procedimento serão inteiramente por nossa conta.

Por gentileza, poderia me enviar os seguintes documentos?
• Foto do RG e CPF (ou CNH) dos proprietários
• Certidão de casamento ou de nascimento
• Número do IPTU
• Número da matrícula do imóvel

Desde já, agradeço a sua colaboração!

Atenciosamente,
[seu nome]`;

export const GUIAS_FIXOS: Topico[] = [
  {
    slug: "passo-a-passo-de-captacao",
    assunto: "Captação",
    tipo: "passo-a-passo",
    titulo: "Passo a passo de captação",
    descricao: "Do primeiro contato com o proprietário até os anúncios nos portais.",
    corpo: {
      tipo: "lista",
      ordenada: true,
      itens: [
        "Identificar o imóvel a captar.",
        "Obter o contato do proprietário (e-móvel, portaria ou indicação).",
        "Verificar se o imóvel já não está no SAN.",
        "Entrar em contato com o proprietário e apresentar os nossos serviços: fazemos parte de uma rede com dezenas de imobiliárias e centenas de corretores; gestão direta pelo(a) corretor(a); divulgação em plataformas, sites e redes sociais; avaliação gratuita; consultoria imobiliária; material de marketing profissional; patrocínio e destaque nos portais; visitas só com horário marcado e uso de propé; corpo jurídico de apoio; cuidamos de contrato, financiamento e cartório.",
        "Subir a pré-captação no SAN.",
        "Agendar uma visita pra apresentar a avaliação e pegar a Autorização de Venda assinada.",
        "Fazer fotos com o celular pra já subir no SAN, até as fotos profissionais ficarem prontas.",
        "Subir o imóvel no SAN com todos os dados (inclusive matrícula e IPTU) e a Autorização de Venda assinada.",
        "Agendar as fotos e vídeos profissionais.",
        "Com o material pronto, substituir as fotos e solicitar subir os anúncios nos portais.",
        "Enviar os links dos anúncios ao proprietário.",
        "A cada 15 dias, dar feedback ao proprietário sobre buscas e visitas — pra caso precise ajustar o valor.",
        "A cada visita, pegar a ficha de visita assinada e preenchida corretamente.",
        "Subir as visitas no SAN em até 24 horas.",
      ],
    },
  },
  {
    slug: "10-formas-de-captar-imovel",
    assunto: "Captação",
    tipo: "guia",
    titulo: "10 formas de captar imóvel",
    descricao: "Ideias para encontrar proprietários e novos imóveis.",
    corpo: {
      tipo: "lista",
      ordenada: true,
      itens: [
        "Criar uma rede de relacionamento intencional — se relacione com clientes em potencial no dia a dia (academia, escola dos filhos, etc.) e ofereça soluções.",
        "Porta a porta (PAP) — visitas presenciais em bairros estratégicos, conversando direto com proprietários.",
        "Anúncios online e redes sociais — portais como OLX e e-móvel pra achar imóveis à venda por particulares, e anúncios patrocinados focados em captar proprietários.",
        "Parcerias com outros corretores — dividir captações e vendas pra ampliar o alcance.",
        "Indicações de clientes — peça indicação de amigos e familiares, e ofereça vantagens a quem indicar um imóvel que vire negócio.",
        "WhatsApp e e-mail marketing — base de contatos organizada, com envios periódicos, status, listas de transmissão e follow up.",
        "Marketing de conteúdo e SEO — conteúdo relevante nas redes sobre como vender ou precificar um imóvel.",
        "Relacionamento com síndicos e administradoras — podem indicar proprietários interessados em vender ou alugar.",
        "Eventos e feiras imobiliárias — ou ações em bairros com grande oferta de imóveis, oferecendo avaliação gratuita.",
        "Divulgação em jornais e revistas locais.",
        "Placas de \"Vende-se\"/\"Aluga-se\" e faixas — ainda muito eficaz.",
      ],
    },
  },
  {
    slug: "passo-a-passo-do-processo-de-venda",
    assunto: "Vendas",
    tipo: "passo-a-passo",
    titulo: "Passo a passo do processo de venda (pra explicar pro cliente)",
    descricao: "Do contrato à posse, na ordem em que acontece.",
    intro:
      "O cliente muitas vezes não sabe o passo a passo e fica ansioso — isso atrapalha o processo. Uma negociação precisa ser explicada. O passo a passo pode mudar conforme o contrato.",
    corpo: {
      tipo: "lista",
      ordenada: true,
      itens: [
        "Contrato de compra e venda enviado pra conferência.",
        "Averbações pendentes na matrícula do imóvel, se houver.",
        "Assinatura do contrato (online ou presencial).",
        "Pagamento do sinal.",
        "Envio da documentação de compradores e vendedores pro banco financiador.",
        "Avaliação do imóvel feita pelo banco.",
        "Processo de financiamento — auxílio e consultoria em tudo que for solicitado.",
        "Escritura enviada pra conferência.",
        "Agendamento da assinatura da escritura (na imobiliária ou no cartório).",
        "Assinatura da escritura.",
        "Escritura enviada pra registro no cartório, com número de protocolo gerado.",
        "Pagamento da baixa de alienação do imóvel, se houver.",
        "Registro realizado (em até 15 dias) — buscamos no cartório e levamos ao banco.",
        "Banco faz o pagamento do financiamento aos vendedores (em até 7 dias).",
        "Posse do imóvel (em até 30 dias), mediante assinatura do Termo de Entrega de Chaves, com cálculo de IPTU, condomínio e demais contas proporcionais.",
        "Auxílio na troca de titularidade de IPTU, água, luz e condomínio pro nome do comprador.",
      ],
    },
  },
  {
    slug: "glossario-tipos-de-propriedade",
    assunto: "Vendas",
    tipo: "guia",
    titulo: "Glossário: tipos de propriedade",
    descricao: "Cessão de direitos, escritura pública, escriturado e sem habite-se.",
    corpo: {
      tipo: "definicoes",
      itens: [
        {
          termo: "Cessão de direitos",
          texto:
            "Não equivale à propriedade registrada em cartório. Geralmente tem IPTU da área toda, e tem cadeia dominial (o histórico completo de quem teve os direitos ou a propriedade do imóvel ao longo do tempo, até chegar ao cedente atual). Não tem ITBI nem registro.",
        },
        {
          termo: "Escritura pública de cessão de direitos",
          texto:
            "Quando o imóvel já possui IPTU desmembrado (inscrição imobiliária própria perante a Receita do DF), a situação costuma ser mais favorável. É feita por escritura pública, assinada em cartório, mas não é registrada. Não aceita financiamento, não tem ITBI nem registro.",
        },
        {
          termo: "Escriturado",
          texto:
            "Tem escritura de compra e venda registrada em cartório. Aceita financiamento (às vezes FGTS, se não foi utilizado nos últimos 2 anos) e consórcio. Tem ITBI e registro.",
        },
        {
          termo: "Escriturado, mas sem habite-se",
          texto:
            "Só o lote é escriturado, a casa não tem habite-se. Aceita financiamento apenas do lote. Tem ITBI e registro do lote.",
        },
      ],
    },
  },
  {
    slug: "regras-ficha-de-visita",
    assunto: "Vendas",
    tipo: "guia",
    titulo: "Regras pra pegar ficha de visita",
    descricao: "De quem pegar, de quem nunca pegar e que dados pedir.",
    corpo: {
      tipo: "lista",
      ordenada: false,
      itens: [
        "Pega ficha de visita de cliente comprador seu (seu lead, ou lead repassado pra você) em qualquer imóvel que você levar — seja da rede, captação sua, ou de outra imobiliária/corretor.",
        "Nunca pega ficha de visita de cliente de colega da rede Netimóveis ou da Sacra, mesmo levando numa captação sua.",
        "Pega ficha de visita do cliente comprador de colega de outra imobiliária/corretor parceiro (quando ele estiver levando numa captação sua), mas só o nome do cliente com os dados do corretor — corretor e cliente dele assinam.",
        "Nunca peça CPF ou telefone do cliente de outra pessoa, e nunca passe os seus.",
      ],
    },
  },
  {
    slug: "lista-de-cnd-na-venda",
    assunto: "Vendas",
    tipo: "guia",
    titulo: "Lista de CND pra conferência na venda (certidões dos vendedores)",
    descricao: "As certidões negativas que conferimos dos vendedores.",
    corpo: {
      tipo: "lista",
      ordenada: true,
      itens: [
        "Certidão Negativa — TRT 10ª Região",
        "Certidão Negativa — Receita Federal",
        "Certidão Negativa — GDF",
        "Certidão Negativa de Débitos Trabalhistas — CNDT",
      ],
    },
  },
  {
    slug: "links-troca-de-titularidade-e-iptu",
    assunto: "Links úteis",
    tipo: "links",
    titulo: "Links úteis (troca de titularidade e IPTU)",
    descricao: "Água, luz e IPTU: onde pedir a troca para o comprador.",
    corpo: {
      tipo: "links",
      itens: [
        { rotulo: "CAESB — Portal de Serviços (água)", href: "https://caesb.df.gov.br/portal-servicos/" },
        {
          rotulo: "Agência Net Fazenda-DF (IPTU)",
          href: "https://www2.agencianet.fazenda.df.gov.br/Atendimento/SAC#/Cadastrar?codAssunto=2&codTipoAtendimento=0",
        },
        { rotulo: "Copaenergia — troca de titularidade", href: "https://mi.copaenergia.com.br/wps/portal/mi/troca-titularidade-cliente" },
        {
          rotulo: "Neoenergia Brasília — troca de titularidade",
          href: "https://www.neoenergia.com/web/brasilia/seu-negocio/troca-de-titularidade",
        },
      ],
    },
  },
  {
    slug: "mensagem-indicacao-porteiro-sindico",
    assunto: "Modelos e documentos",
    tipo: "mensagem",
    titulo: "Mensagem: pedido de indicação — porteiro/síndico",
    descricao: "Para propor parceria a porteiros e síndicos.",
    corpo: { tipo: "mensagem", texto: MENSAGEM_PORTEIRO },
  },
  {
    slug: "mensagem-programa-imovel-seguro",
    assunto: "Modelos e documentos",
    tipo: "mensagem",
    titulo: "Mensagem: convite pro Programa Imóvel Seguro",
    descricao: "Para pedir ao proprietário os documentos do selo do DF Imóveis.",
    corpo: { tipo: "mensagem", texto: MENSAGEM_IMOVEL_SEGURO },
  },
  {
    slug: "ficha-de-captacao",
    assunto: "Modelos e documentos",
    tipo: "documento",
    titulo: "Ficha de Captação",
    descricao: "Modelo em Word para preencher na captação.",
    corpo: { tipo: "download", href: "/materiais/ficha-de-captacao.docx", formato: ".docx" },
  },
  {
    slug: "carta-proposta-de-compra",
    assunto: "Modelos e documentos",
    tipo: "documento",
    titulo: "Carta de Proposta de Compra",
    descricao: "Modelo em Word da proposta do comprador.",
    corpo: { tipo: "download", href: "/materiais/carta-proposta-compra-modelo.docx", formato: ".docx" },
  },
  {
    slug: "relatorio-para-proprietarios",
    assunto: "Modelos e documentos",
    tipo: "documento",
    titulo: "Relatório para Proprietários",
    descricao: "Modelo em Word do retorno periódico ao proprietário.",
    corpo: { tipo: "download", href: "/materiais/relatorio-para-proprietarios.docx", formato: ".docx" },
  },
];
