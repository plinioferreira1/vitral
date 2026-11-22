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
