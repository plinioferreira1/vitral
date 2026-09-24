-- =========================================================
-- Reestruturação dos cargos: adiciona "social_media" como novo
-- nível de acesso (ligado à categoria Marketing, com acesso só
-- ao Onboarding e às calculadoras gerais). "gerente_locacao"
-- deixa de ser usado — quem tinha esse nível vira "supervisor"
-- (já era funcionalmente idêntico).
-- =========================================================

alter type nivel_acesso_usuario add value if not exists 'social_media';

update usuarios set nivel_acesso = 'supervisor' where nivel_acesso = 'gerente_locacao';
