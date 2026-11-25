# Zoho Mail ↔ Locação — etapa 1 (somente leitura)

## Implementado nesta branch

`GET /api/integracoes/zoho/locacao?limit=30`

- Exige sessão autenticada Supabase.
- Autoriza somente usuários ativos com perfil `admin`/`gerente` ou nível `diretor`/`gerente`.
- Obtém access token via refresh token OAuth 2.0, exclusivamente no servidor.
- Busca mensagens da pasta configurada da conta Zoho, sem marcá-las como lidas.
- Limite de 1 a 100 mensagens, cache desativado.
- Falha com 503 enquanto as credenciais não estão configuradas.
- Não escreve no banco de dados, não envia mensagens e não altera a caixa postal.

## Configuração pendente (Vercel; somente server-side)

Criar aplicação OAuth **Server-based Application** na [Zoho API Console](https://api-console.zoho.com/).
Autorizar somente `ZohoMail.messages.READ` nesta primeira fase. Para descobrir a conta/pasta via API, adicionar `ZohoMail.accounts.READ` e `ZohoMail.folders.READ` durante a configuração, caso necessário.

A caixa de correio destinada à integração é **locacao@sacraimoveis.com.br**. A Vercel de produção já possui (nomes identificados, valores não consultados) as variáveis:\n\n- `ZOHO_LOCACAO_CLIENT_ID`\n- `ZOHO_LOCACAO_CLIENT_SECRET`\n- `ZOHO_LOCACAO_REFRESH_TOKEN`\n- `ZOHO_LOCACAO_ACCOUNT_ID`\n\nA rota também aceita os nomes antigos `ZOHO_MAIL_*` como alternativa. O identificador da pasta de entrada pode ser configurado como `ZOHO_LOCACAO_INBOX_FOLDER_ID` ou `ZOHO_MAIL_INBOX_FOLDER_ID`; se não estiver presente, a rota busca a pasta Inbox pela API de pastas, que requer o escopo `ZohoMail.folders.READ`.\n\n**Importante:** essas variáveis existentes estão restritas ao ambiente de produção. Para testar em Preview, será necessário configurar a conexão no ambiente de Preview sem compartilhar os segredos. Não pressupor que o token já tenha os escopos necessários.
- `ZOHO_ACCOUNTS_URL` (opcional; padrão: https://accounts.zoho.com)
- `ZOHO_MAIL_API_URL` (opcional; padrão: https://mail.zoho.com)

**Não inserir tokens no GitHub nem enviar credenciais em chats.** Configurar diretamente na Vercel, pela interface de variáveis de ambiente. Conferir a região da conta Zoho antes de conceder acesso.

## Próximos incrementos, após conexão validada

1. Persistência idempotente das mensagens (tenant + conta + messageId) com RLS e vínculo opcional a `contratos_locacao`.
2. Tela de caixa de entrada da Locação; não exibir HTML remoto sem sanitização robusta.
3. Relacionamento inicialmente sugerido por e-mail dos participantes e número de contrato; exigir revisão humana antes de confirmar associações ambíguas.
4. Histórico por contrato com permissões específicas de Locação.
5. Respostas enviadas pelo VITRAL somente em fase posterior, com consentimento explícito e escopo OAuth de envio separado.

## Validação antes de liberar

- Retornar 401 sem login, 403 para usuário não autorizado, 503 sem configuração.
- Usuário gestor autorizado vê apenas as mensagens da conta configurada.
- Verificar lista e erros do Zoho sem expor corpo integral em logs.
- Conferir que mensagens não são marcadas como lidas e que nenhuma resposta é enviada.
- Executar typecheck, build, testes e inspecionar deployment preview.
- Não publicar na produção antes do teste funcional com autorização Zoho.

Documentação oficial: https://www.zoho.com/mail/help/api/get-emails-list.html

---

# Situação em 25/11/2026 (Etapa 3 do plano)

## O que já funciona

| Objetivo | Situação | Onde |
| --- | --- | --- |
| Consultar mensagens recebidas e respostas | Pronto (leitura ao vivo, sem marcar como lida) | `/locacao/emails`, `GET /api/integracoes/zoho/locacao` |
| Guardar respostas das administradoras | Pronto: o cron grava em `debitos_respostas_email` (remetente, assunto, resumo, data, anexo) | `api/cron/zoho-locacao-respostas`, `src/lib/debitos/zoho-respostas.ts` |
| Associar conversa ao contrato | Pronto quando a resposta vem de uma solicitação do VITRAL: etiqueta `[VITRAL:código]` no assunto ou remetente = destinatário da solicitação; o contrato vem dos itens da solicitação | idem |
| Histórico cronológico no contrato | **Novo nesta branch**: seção "E-mails com a administradora" no contrato (enviados + recebidos, mais recentes primeiro) | `src/components/locacao/emails-contrato.tsx`, regras em `src/lib/locacao/emails-contrato.ts` |
| Indicar o que precisa de atendimento | **Novo**: resposta recebida depois do último registro de resposta da solicitação (ou sem registro) aparece em destaque, com contador | idem |
| Responder pelo sistema | Não implementado (ver arquitetura abaixo) | — |

Visibilidade: a seção só aparece para quem tem `debitos_pode_ver()` (mesma regra das tabelas `debitos_*`). Nada novo foi gravado no banco e nenhuma credencial chega ao navegador.

## Lacunas conhecidas

- E-mails que não respondem a uma solicitação do VITRAL (ex.: locatário escrevendo direto) não são gravados — o cron só guarda o que tem administradora/solicitação identificada, de propósito, para não copiar mensagens pessoais. Ligar esses e-mails a contratos exige revisão humana (sugestão por remetente cadastrado no locatário/locador + confirmação na tela), não associação automática.
- O corpo completo e os anexos continuam só na leitura ao vivo (`/locacao/emails`); o histórico do contrato mostra o resumo.

## Arquitetura proposta para responder pelo VITRAL (fase futura)

1. **Escopo OAuth separado**: novo refresh token com `ZohoMail.messages.CREATE` (e só ele), em variável própria (`ZOHO_LOCACAO_SEND_REFRESH_TOKEN`), nunca reaproveitando o de leitura.
2. **Rascunho antes de enviar**: tabela `locacao_emails_rascunhos` (tenant, contrato, mensagem respondida, para, assunto, corpo, criado_por, status `rascunho|enviado|falha`, enviado_em, id Zoho). O envio é uma ação explícita de quem tem `debitos_pode_operar()`, com a pré-visualização na tela e confirmação.
3. **Envio só no servidor**: `POST` em `/api/accounts/{id}/messages/{messageId}` (reply) da API Zoho Mail, com o `In-Reply-To` original, mantendo a etiqueta `[VITRAL:…]` no assunto para o retorno ser reconhecido.
4. **Auditoria**: cada envio registra evento em `debitos_eventos` (quem, quando, para quem; sem o corpo em log).
5. **Testes antes de ligar**: conta de teste no Zoho, destinatário interno, sem envio real a administradoras até autorização expressa.
