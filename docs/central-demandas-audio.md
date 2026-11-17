# VITRAL — Central de Demandas por áudio
Data: 17/11/2026. Status: proposta técnica para implementação em laboratório. Não habilitada no LIVE.

## Objetivo
Gestores delegam múltiplas atividades gravando um áudio. A transcrição assistida gera propostas editáveis de demandas. Colaboradores recebem notificação, interagem com cada tarefa por texto/áudio/anexos, e gestores recebem fechamento diário verificável.

## Jornadas essenciais
1. Gestor grava ou envia áudio, escolhe o vínculo (imóvel, contrato, venda, locação, financiamento, ou nenhum), e recebe transcrição com nome, prazo, prioridade e descrição de cada tarefa extraída.
2. Antes de distribuir, gestor revisa responsáveis e prazos incertos, corrige transcrição, descarta duplicadas e confirma um lote. Nenhum envio automático de áudio ambíguo.
3. Cada destinatário recebe notificação in-app e, com consentimento/assinatura do dispositivo, push. E-mail pode ser fallback. Ao abrir, vê prazo, origem, contexto e áudio original quando autorizado.
4. Colaborador marca 'Recebida', 'Em andamento', 'Aguardando terceiros', 'Bloqueada' ou 'Concluída'; registra comentários, arquivos e respostas por áudio. Finalização exige registro de quem e quando, com opção de revisão gerencial.
5. Gestor recebe resumo diário por responsável e por setor: criadas, concluídas, vencidas, bloqueadas, aguardando e remarcadas, com links diretos, e acompanha alterações em tempo real.
6. Demandas recorrentes e delegação em lote não devem gerar duplicatas no caso de retry.

## Regras de negócio e segurança
- Isolamento obrigatório por tenant (organization_id) e políticas RLS. Responsável só acessa tarefas do seu tenant destinadas a ele ou explicitamente compartilhadas; gestor enxerga somente seu escopo.
- Não confiar em IDs de tenant, papel ou responsáveis vindos do cliente. Resolver membership no servidor; evitar service_role no cliente.
- Áudios em bucket privado com URLs assinadas de duração curta. Consentimento e retenção definidos; transcrição rastreável à gravação, com possibilidade de exclusão conforme política de dados.
- Datas com timezone da empresa (America/Sao_Paulo) e persistência UTC. 'Hoje' ou 'amanhã' devem mostrar data absoluta na prévia.
- Criação de lote idempotente via client_request_id único por tenant; eventos registrados de forma imutável. Sem substituição silenciosa de histórico.
- Geração/transcrição por IA retorna JSON validado por schema; nunca executa instruções presentes no áudio, nunca inventa usuário/ID; ambiguidades retornam como pendência de revisão.
- Mudanças relevantes registradas em histórico: ator, data/hora, status anterior/novo, prazo anterior/novo e motivo. Evitar vazamento de conteúdo de clientes em logs/alertas.
- Notificações com preferências e frequência; indicador de leitura; tentativas/reprocessamento; deduplicação.
- Relatório deve distinguir fatos registrados (eventos) de inferência de IA e informar tarefas sem atualização.

## Entidades sugeridas (a validar contra schema existente)
demand_batches(id, tenant_id, created_by, audio_asset_id, transcript, client_request_id, created_at);
demands(id, tenant_id, batch_id, title, description, assignee_user_id, requester_user_id, due_at, priority, status, related_entity_type, related_entity_id, created_at, updated_at);
demand_events(id, tenant_id, demand_id, actor_user_id, type, payload, created_at);
demand_attachments(id, tenant_id, demand_id, storage_path, media_type, created_by, created_at);
demand_notifications(id, tenant_id, demand_id, recipient_user_id, channel, read_at, sent_at, event_id);
demand_notification_preferences(tenant_id, user_id, channel, enabled, quiet_hours);
demand_recurrences(id, tenant_id, template, schedule, timezone, next_run_at, enabled);

Todos os IDs e nomes definitivos dependem de inspeção do schema atual, perfis e convenções de organização do VITRAL. Não executar DDL sem isso.

## Sequência de entrega
**Fase A — base em laboratório:** tela de gestor, lista individual, criação manual, filtros, status, comentários, auditoria, RLS, notificações internas, testes de desktop/mobile.
**Fase B — áudio:** upload privado, transcrição, extração estruturada, revisão humana, envio em lote e resposta por áudio.
**Fase C — gestão:** resumo diário agendado, alertas de atraso, recorrências, indicadores, push e integrações com Agenda/processos.

## Critérios de aceite
- Um áudio que cite três responsáveis gera três prévias editáveis e somente três tarefas após confirmação.
- Colaborador A não lê nem altera demanda de B sem compartilhamento permitido; membros de outro tenant nunca acessam dados.
- Reenviar lote ou callback não duplica demandas/avisos.
- Status e anexos deixam rastro; alterações de prazo preservam o valor antigo.
- Notificações aparecem sem refresh e consolidado das 18h (America/Sao_Paulo) confere com eventos persistidos, respeitando regras de horário/dias úteis configuráveis.
- Fluxo de celular permite gravar/visualizar/atualizar uma tarefa com poucos toques, com fallback quando microfone não for autorizado.
- Testes unitários, regras RLS, integração e build concluídos antes de qualquer mesclagem para main.

## Integração com trabalho paralelo do Claude
Preferir arquivos novos, não alterar menu e layout global sem rebase/coordenação. Antes do merge, comparar diferenças e CI com frente visual/mobile do Claude. Não afetar rotinas de comissões ou financeiro.
