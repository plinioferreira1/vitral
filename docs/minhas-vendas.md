# Minhas vendas

Acesso do nível corretor em `/minhas-vendas` e `/minhas-vendas/[id]`, somente consulta. A gestão confirma `corretores.usuario_id` em Usuários e Acessos. Nenhum vínculo é criado automaticamente e nenhuma venda sem corretor é atribuída por inferência.

A RPC `public.minhas_vendas(uuid)` é SECURITY INVOKER, acessível apenas ao papel authenticated. O auxiliar em `vitral_private` retorna somente campos permitidos após verificar usuário ativo, nível corretor, empresa e vínculo do cadastro do corretor. Não são liberadas tabelas operacionais ao corretor. Categoria operacional eventualmente atribuída a ele não amplia o acesso.

O trigger de corretores impede mudanças de vínculo ou empresa por pessoas fora da gestão, inclusive chamadas diretas. A política impede corretores de alterar cadastros de corretores. O salvamento pela interface também usa o vínculo anterior para detectar concorrência.

A lista e o detalhe mostram identificação, imóvel, nomes de comprador/vendedor, responsável, prazo contratual, etapas/datas e publicações destinadas ao corretor. Não retornam comissões, valores internos, comentários, histórico bruto, dados pessoais completos ou anexos. Prazo de etapa e prazo contratual vencidos são situações distintas. Conta desativada ou corretor retirado do processo perde a leitura na consulta seguinte.

Atualizações da gestão são registros próprios em `processo_atualizacoes_corretor`, com autor e horário do servidor. Apenas diretor/gerente ativo da mesma empresa pode publicá-las. Não há edição/remoção pelo corretor. Não se copiam automaticamente observações internas.

Validação: testes de prazos/filtros em `src/lib/minhas-vendas.test.ts`; proteção do menu em `menu.test.ts`; teste integrado do banco em `scripts/minhas-vendas-seguranca.sql`. Este último cria dados fictícios dentro de uma transação e termina em ROLLBACK, verificando isolamento de duas contas, IDs de terceiros e outra empresa, ausência de campos internos, bloqueio de edição, vínculo direto, publicação por corretor, conta desativada, revogação após mudança e acesso anônimo.

A migração `20261007124508_acompanhamento_corretor.sql` já foi aplicada pelo conector e tem a mesma versão do histórico remoto; o workflow não deve reaplicá-la.
