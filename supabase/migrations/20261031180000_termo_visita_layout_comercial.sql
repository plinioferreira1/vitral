-- Novo layout comercial do termo de visita, preservando os registros e assinaturas anteriores.
alter table public.termos_visita
  add column if not exists imoveis_visitados jsonb not null default '[]'::jsonb,
  add column if not exists hora_visita time,
  add column if not exists cliente_cpf_informado text,
  add column if not exists cliente_rg_informado text,
  add column if not exists corretor_creci text,
  add column if not exists corretor_creci_j text,
  add column if not exists imobiliaria_parceira text;
comment on column public.termos_visita.imoveis_visitados is 'Até sete imóveis: descrição, código e valor em reais, em ordem de visita.';

-- RPC separada para preservar compatibilidade com a assinatura existente.
create or replace function public.termo_visita_buscar_ficha(p_token uuid)
returns table (
  termo_id uuid, ja_assinado boolean, imovel_endereco text, codigo_imovel text,
  valor_imovel numeric, cliente_nome text, cliente_telefone text, cliente_email text,
  corretor_nome text, multa_percentual numeric, data_visita date, status_termo text,
  imoveis_visitados jsonb, hora_visita time, cliente_cpf_informado text,
  cliente_rg_informado text, corretor_creci text, corretor_creci_j text,
  imobiliaria_parceira text, nota integer, feedback text, observacoes text
)
language sql security definer stable set search_path = public
as $$
  select t.id, t.assinado_em is not null, i.endereco, t.codigo_imovel,
    t.valor_imovel, c.nome, c.telefone, c.email, co.nome, t.multa_percentual,
    t.data_visita, t.status, t.imoveis_visitados, t.hora_visita,
    t.cliente_cpf_informado, t.cliente_rg_informado, t.corretor_creci,
    t.corretor_creci_j, t.imobiliaria_parceira, t.nota, t.feedback, t.observacoes
  from public.termos_visita t
  join public.imoveis i on i.id = t.imovel_id
  join public.clientes c on c.id = t.cliente_id
  left join public.corretores co on co.id = t.corretor_id
  where t.token = p_token and t.status <> 'cancelado'
$$;
revoke all on function public.termo_visita_buscar_ficha(uuid) from public;
grant execute on function public.termo_visita_buscar_ficha(uuid) to anon, authenticated;
