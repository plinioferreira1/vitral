-- Vínculos profissionais solicitados: gestores e Jefté como corretores.
-- Não altera nivel_acesso, nem vendas, comissões ou registros históricos.
-- Só atribui cadastros desvinculados à conta ativa da mesma organização.
update public.corretores c
set usuario_id = casos.usuario_id
from (values
 ('b4fc0664-58e9-43db-a7c5-4563812f00e1'::uuid, 'bee48e06-ec90-4b07-8a5b-cf9ea96847ed'::uuid), -- Amanda
 ('bc294b4f-b95e-4dc4-8488-53dc4b17fe15'::uuid, 'dd5340da-77da-4932-805f-93195cb90c7c'::uuid), -- Jefté
 ('e515cb40-8467-46cb-8114-a5cf8e29e13c'::uuid, '6f187285-ad87-4031-9dff-8c99364ec389'::uuid), -- Plínio Ferreira
 ('a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7'::uuid, 'fab93451-b09c-44eb-b6a7-3fca7bb89f16'::uuid)  -- Ricardo
) as casos(corretor_id,usuario_id)
where c.id=casos.corretor_id and c.usuario_id is null
  and exists(
    select 1 from public.usuarios u
    where u.id=casos.usuario_id and u.tenant_id=c.tenant_id and u.ativo
  );
