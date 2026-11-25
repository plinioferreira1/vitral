# Estudo — busca de imóveis em portais para o cliente (Etapa 5)

Situação: **estudo, sem implementação**. Data: 25/11/2026.

## Pergunta

Uma ferramenta interna que recebe o perfil do cliente (região, tipo, preço, quartos, vagas, metragem, financiamento), consulta fontes autorizadas, mostra links válidos, identifica anúncios repetidos, deixa o corretor escolher e gera uma apresentação.

## O que as fontes oferecem hoje

| Fonte | Acesso oficial para *buscar* anúncios de terceiros | Observação |
| --- | --- | --- |
| ZAP Imóveis / Viva Real / OLX (Grupo OLX) | Não encontrei API pública de busca | As integrações oficiais são de **publicação** (feed XML da imobiliária para o portal). Os "APIs" de ZAP/VivaReal encontrados na internet são raspadores de terceiros (ex.: atores da Apify), que não são autorizados pelo portal — **não usar**. |
| DF Imóveis | Não encontrei API pública de busca | Recebe anúncios de imobiliárias/corretores com CRECI; mostra redes parceiras, entre elas a Netimóveis. |
| Netimóveis / SAN | A confirmar com a rede | É a fonte mais natural: a Sacra já faz parte da rede e os imóveis da rede estão no SAN. Perguntar à Netimóveis se há API ou exportação (XML/CSV) para associados. |
| Órulo (lançamentos) | Sim, por parceria (Client ID / Secret) | Plataforma de incorporadoras que disponibiliza empreendimentos a imobiliárias; outros sistemas imobiliários já importam por integração oficial. |

## Recomendação

Construir em duas partes, sem raspagem:

1. **Agora, sem integração** — "Seleção para o cliente":
   - o corretor preenche o perfil; o VITRAL monta os **links de busca** dos portais com os filtros (abrem no navegador do corretor, como uma busca normal);
   - o corretor cola os links dos anúncios que escolheu; o VITRAL guarda título, preço, área, quartos, vagas e endereço que ele confirma;
   - repetidos são apontados por endereço normalizado + área + preço próximos (regra pura, com teste);
   - gera uma apresentação (PDF ou página privada) no padrão visual da Sacra, com o link de cada anúncio.
2. **Depois, com acesso autorizado** — importar automaticamente da Netimóveis/SAN e da Órulo, se as parcerias liberarem API ou exportação. Mesmas telas; só muda a origem dos dados.

## Antes de começar a parte 2

- Pedir por escrito à Netimóveis e à Órulo as condições de uso dos dados (quem pode ver, se pode mostrar ao cliente final, prazo de atualização).
- Não guardar dados pessoais de anunciantes além do necessário; links e dados do imóvel bastam para a apresentação.
