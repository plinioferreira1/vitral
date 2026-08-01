-- =========================================================
-- Adiciona "imobiliária" como opção de quem paga um encargo
-- (além de locador/locatário), e define o padrão: por regra
-- geral, o locatário paga IPTU, condomínio, água, luz e gás
-- — com exceções específicas por contrato.
-- =========================================================

alter type responsavel_pagamento_locacao add value if not exists 'imobiliaria';
