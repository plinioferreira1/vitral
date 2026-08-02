-- =========================================================
-- Novo nível de acesso: "corretor". Diferente dos outros
-- (diretor/gerente/supervisor/auxiliar), o corretor não tem
-- acesso a processos, locação, calendário nem configurações —
-- só às duas calculadoras (Simulação de Custas e Calculadora
-- de Proporcionalidade). Ver migration seguinte pro resto do
-- ajuste (não dá pra usar o valor novo na mesma migration que
-- o cria).
-- =========================================================

alter type nivel_acesso_usuario add value if not exists 'corretor';
