-- Senhas de portal das administradoras não ficam no Vitral (autorizado pela
-- direção em 26/11/2026). Apaga as que estavam em texto simples e impede que
-- voltem a ser gravadas. URL e login do portal continuam.
update public.contratos_locacao
set portal_administradora_senha = null
where portal_administradora_senha is not null;

alter table public.contratos_locacao
  add constraint contratos_locacao_sem_senha_portal
  check (portal_administradora_senha is null);
