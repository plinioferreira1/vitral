# Negociações de venda

Em **Vendas → Negociações**, a equipe cadastra oportunidades antes da abertura do processo operacional. O Início mostra o saldo em andamento, os encerramentos do mês e os três próximos acompanhamentos. O auxiliar pode consultar; gestão e supervisores com Vendas podem cadastrar e encerrar. Corretores e social media não recebem acesso operacional novo.

## Uso

1. Clique em **Nova negociação**, registre cliente, imóvel, responsável e data de abertura. Valor, vendedor e demais informações podem ser completados durante o acompanhamento.
2. Salve o cadastro antes de fechar a venda. Para converter, informe vendedor, valor positivo e escolha um modelo ativo de Vendas.
3. **Fechar venda e criar processo** cria o processo ativo, com comprador, vendedor, imóvel, valor, corretor, responsável e etapas sequenciais do catálogo da mesma empresa. O histórico do processo identifica a negociação de origem. A negociação mantém um link para o processo.
4. **Marcar como perdida** exige um motivo e mantém o registro no histórico, sem criar processo.

Conversão e perda são encerramentos definitivos nesta primeira versão. Cancelar posteriormente um processo não apaga a conversão comercial. Os cadastros de comprador, vendedor e imóvel do processo são criados a partir dos dados da negociação; não há associação automática por igualdade de nome/endereço com outros cadastros.

## Indicadores

- **Em andamento agora**: saldo atual; não representa o saldo histórico no fim do mês selecionado.
- **Novas no mês**: data de abertura.
- **Convertidas / perdidas no mês**: data do encerramento em America/Sao_Paulo, independentemente da abertura.
- **Taxa de conversão**: convertidas ÷ (convertidas + perdidas) no mês; sem encerramentos mostra traço.
- Valores são os valores de venda; não se confundem com comissões ou recebimentos.

Filtro por responsável afeta indicadores e lista; os cartões abrem os registros que compõem o indicador. **Ver todo o histórico** mostra também as negociações encerradas em outros meses. Responsáveis que foram desativados continuam no filtro histórico.

## Integridade e verificação

As duas tabelas têm RLS e somente leitura para usuários autenticados da operação de Vendas da empresa. Toda escrita passa pela sessão conferida na Server Action e por RPC `SECURITY INVOKER`, executável somente por `service_role`, com conferência adicional de autor e empresa. Eventos guardam retratos antes/depois e não podem ser editados pelo usuário. Atualização exige a versão lida no formulário; encerramento trava a linha e repetições devolvem o mesmo processo. Processo vinculado não pode ser apagado fisicamente: use seu fluxo de cancelamento/arquivamento para manter o histórico comercial.

As migrations já foram aplicadas no projeto Supabase Vitral com os mesmos números versionados no repositório, e os tipos foram regenerados. A interface só aparece após publicar este código. Não há cadastro real de demonstração.

Verificações: testes Vitest de datas, métricas e permissões; `scripts/negociacoes-seguranca.sql` usa dados fictícios e `ROLLBACK` para conferir escrita, RLS, isolamento, motivos de perda, etapas e conversão idempotente. A leitura paginada evita o limite padrão de 1.000 linhas nos indicadores. O resumo do Início é carregado em Suspense e informa falha de leitura sem transformar erro em contagem zero.
