-- Permite a ficha de fiador/corresponsável chegar sem ligação até a equipe conferir o nome.
alter table public.fichas_cadastrais_locacao
 add column if not exists nome_titular_informado text;
alter table public.fichas_cadastrais_locacao
 drop constraint if exists fichas_locacao_vinculo_coerente;
alter table public.fichas_cadastrais_locacao
 add constraint fichas_locacao_vinculo_coerente check (
   (tipo_locatario = 'titular' and ficha_principal_id is null)
   or (tipo_locatario <> 'titular' and
      (ficha_principal_id is not null or nullif(btrim(nome_titular_informado), '') is not null))
 );