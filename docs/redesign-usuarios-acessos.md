# Usuários e Acessos — auditoria e entrega

Esta entrega reorganiza a gestão de contas do Vitral em Configurações > Usuários e Acessos, mantendo `/membros` e a autorização existente. O cadastro profissional continua no Departamento Pessoal.

## Auditoria do código atual

- `usuarios.perfil`: enum de função operacional (`admin`, `diretora`, `gerente`, `corretor`, `correspondente`, `financeiro`). Não concede sozinho acesso administrativo.
- `usuarios.nivel_acesso`: controla acesso real. Diretor e gerente administram contas, Financeiro e DP; auxiliar acessa operação; supervisor usa categorias; corretor e social media têm rotas/ferramentas limitadas.
- `gerente_locacao`: valor legado ainda aceito no enum gerado. A migration 0074 converteu contas desse nível para supervisor, mas o enum permaneceu. A tela preserva eventual valor legado ao salvar; não oferece esse nível em novos convites.
- Categorias: `venda`, `financiamento`, `locacao`, `marketing`. Marketing não cria um módulo próprio no menu. Categorias não limitam diretor/gerente/auxiliar nem ampliam corretor/social media.
- Autorização: `getUsuarioAtual`, `getPermissoesUsuario`, `montarMenu`, Server Actions de membros e RPC `atualizar_categorias_membro`. As ações administrativas existentes conferem nível e empresa; a RPC preserva a transação de alteração do nível e das categorias.
- DP: `dp_colaboradores.usuario_id` é vínculo opcional e único. Cargo/departamento/empresa/gestor permanecem na ficha. `permissoesDP` combina nível, vínculo e equipe subordinada; `acessoDP` e RLS restringem leitura. Escritas usam ações administrativas e `dp_eventos`.
- Restrição atual: `EM_FINALIZACAO.departamentoPessoal` está ativo. O DP permanece disponível apenas a diretor/gerente. A UI informa essa restrição; não promete que um vínculo sozinho libera o módulo.
- Convites: têm RLS de leitura, inserção e remoção; não têm UPDATE do usuário autenticado. Renovação passa pelo servidor, confere gestor/tenant/convite pendente e usa o cliente administrativo com os mesmos filtros, token anterior e `usado_em IS NULL`.
- Exclusão: apagar conta de autenticação pode remover dados de férias por cascata. A nova listagem não oferece exclusão definitiva como ação cotidiana. Não foi substituída por uma falsa desativação: `ativo` ainda não é uma trava uniforme de autorização em todas as rotas.

## Implementado

- Cabeçalho simples, botão de convite e quatro indicadores compactos.
- Busca sem acentos por nome/e-mail; filtros por situação, perfil, área e vínculo.
- Tabela desktop e lista própria no celular; ações secundárias em um menu.
- Modal grande com identidade, perfil/acessos reais, vínculo com DP e senha.
- Convite por link, resumo de acesso, confirmação de concessão administrativa, cancelamento e renovação de token por sete dias. A geração e renovação não enviam e-mail; o usuário copia e compartilha o link.
- Redefinição individual por e-mail e senha manual mascarada.
- Vínculo de ficha existente, sem duplicar cadastro, com validação da empresa, constraint única e condição de ficha ainda sem usuário. Reutiliza sincronização de férias e registra evento no DP; sincroniza subordinados quando a ficha vinculada é gestora.
- Proteção server-side contra remover o próprio acesso administrativo, contra alvo fora da empresa e contra concessão administrativa sem confirmação.
- Estados vazios, carregamento, erros de consulta e feedback de gravação. Diálogos nativos têm foco/teclado e botão de fechar; submissões usam `BotaoEnviar`.
- Resumo das áreas deriva do mesmo construtor de menu utilizado pelo app.

## Arquivos

Alterados:

- `src/app/(app)/membros/page.tsx`
- `src/app/(app)/membros/actions.ts`
- `src/app/(app)/dp/actions.ts`
- `src/lib/menu.ts`

Criados:

- `src/app/(app)/membros/usuarios-acessos.tsx`
- `src/app/(app)/membros/formularios.tsx`
- `src/app/(app)/membros/loading.tsx`
- `src/app/(app)/membros/actions.test.ts`
- `src/lib/acessos.ts`
- `src/lib/acessos.test.ts`
- `docs/redesign-usuarios-acessos.md`

## Modelagem e próximos passos

Não há migration, nova tabela, novo enum ou nova permissão. Modelagem atual preservada: conta (`usuarios`) + categorias (`usuario_categorias`) + ficha profissional (`dp_colaboradores`) + convites (`convites`).

A matriz granular, os perfis personalizados com exceções, a desativação com revogação efetiva de sessão e o histórico completo das mudanças de acesso exigem evolução conjunta de banco, RLS, RPCs e verificações server-side. Não foram representados por checks decorativos nesta entrega. A auditoria do vínculo usa `dp_eventos`; alterações de nível/categoria ainda não têm trilha administrativa completa. O vínculo e a sincronização de férias seguem as ações existentes e são operações separadas, não uma transação nova de banco.

Convite ainda não se liga a uma ficha antes do aceite: o vínculo é feito explicitamente depois que a conta existe. Último acesso não é exibido, pois não há dado confiável consultado por esta página.

## Validação

- Typecheck: passou.
- Testes: 249 passaram (22 arquivos), incluindo seis testes novos de resumo de permissões e seis de ações administrativas.
- Lint: zero erros; sete avisos preexistentes em arquivos fora desta alteração.
- Build: passou.
- Sem credenciais Supabase nesta cópia: operações reais de banco, fluxo autenticado e entrega de e-mail não foram executados. Testes de ações usam doubles somente no teste; o app consulta e grava no Supabase real.
- QA visual em navegador pendente: o ambiente não disponibilizou Chromium e o download falhou. Layouts desktop/mobile foram revisados no código, sem afirmar validação visual em 390/430 px.
- As suítes existentes de Financeiro, Férias, Ponto, Termos, Avaliações e demais regras passaram; isto não equivale a uma validação manual de cada módulo em produção.
