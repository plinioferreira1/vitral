# Investigação de 14/10/2026 — ações confirmadas, interface pendente

## Evidência

- A aba afetada continuava mostrando o editor em rascunho e botões desabilitados. A consulta de leitura ao banco mostrava o termo gerado e a versão correspondente. Abrir o mesmo endereço em outra aba exibiu o documento e o PDF normalmente.
- O console da aba afetada registrou `TypeError: Cannot read properties of null (reading 'removeChild')`. A posição no bundle público corresponde à remoção de um `HostHoistable` no React distribuído pelo Next 16.2.12. O título e os metadados da página já não estavam no head.
- Isso localiza a falha observada na aplicação da atualização no navegador, após a gravação, e não no cálculo do PDF. Não prova por si só quem removeu o elemento original.
- Uma reprodução mínima local, com as mesmas versões, encontrou também uma divergência de hidratação: um elemento externo `#tab-color-line` estava no lugar do contêiner de metadados esperado. A reprodução simples recuperou a hidratação e completou a ação; portanto essa interferência é uma pista, não prova suficiente de causalidade para o erro fatal da aba original. Nenhuma extensão foi desativada.

## Correção aplicada aos termos

- O editor recebe a confirmação por POST/JSON, sem disparar uma atualização RSC. Após gerar ou solicitar prévia, faz uma navegação completa para a página confirmada. Os demais formulários do módulo usam POST com retorno 303, incluindo geração pela prévia, duplicação, responsável e ações de assinatura.
- O endpoint valida origem, sessão, ação e identificadores. As funções existentes continuam verificando autorização e usando a sessão/RLS. Não repete automaticamente operações após erro ou timeout.
- O editor libera os controles em `finally`, conserva os campos em erro e informa quando a confirmação não chegou. A criação conserva o identificador da solicitação entre tentativas.
- A gravação de rascunho passa a usar a RPC transacional já publicada, com revisão otimista: cabeçalho, partes, encargos e auditoria são confirmados juntos; outra aba não pode sobrescrever silenciosamente uma revisão mais nova.

## Limites e validação

- A correção de transporte está restrita a Termos de Entrega de Chaves. Etapas de processos já têm POST/303. Não afirmar que todos os formulários do site foram migrados.
- Testes de rota cobrem JSON, 303, bloqueio de geração após falha no salvamento, origem externa, sessão ausente e ação desconhecida. Testes de transporte cobrem conflito, HTML inesperado e queda de conexão.
- O teste SQL de regressão usa registros fictícios e ROLLBACK. A conferência de produção foi somente de leitura; não gerar, assinar nem reenviar documentos reais para testar.
- As funções internas de reconhecimento de redirect do Next estão isoladas no endpoint e cobertas por teste; revisar ao atualizar o framework.
