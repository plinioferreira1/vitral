-- Remove versões antigas (sobrecargas) das funções de membros que ainda
-- estavam instaladas. Elas conferiam permissão pelo campo antigo
-- `perfil` (admin/diretora/gerente) em vez de `nivel_acesso`, e seguiam
-- chamáveis direto pela API. O sistema só usa as versões com
-- p_nivel_acesso, que exigem nível diretor/gerente — essas ficam.

drop function if exists public.add_member(text, perfil_usuario);
drop function if exists public.add_member(text, perfil_usuario, categoria_processo[]);
drop function if exists public.atualizar_categorias_membro(uuid, categoria_processo[]);
