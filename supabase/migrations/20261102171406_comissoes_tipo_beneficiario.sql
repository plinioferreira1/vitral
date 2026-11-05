-- Registro no repositório da migration já aplicada no banco em 02/11/2026
-- (rateio com beneficiário SACRA / PARCERIA / corretor).
alter table public.comissoes add column if not exists tipo_beneficiario text not null default 'corretor';
alter table public.comissoes drop constraint if exists comissoes_tipo_beneficiario_check;
alter table public.comissoes add constraint comissoes_tipo_beneficiario_check check (tipo_beneficiario in ('corretor','sacra','parceria'));
