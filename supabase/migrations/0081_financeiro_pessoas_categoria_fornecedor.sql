alter table financeiro_pessoas
  add column if not exists categoria_fornecedor text
  check (categoria_fornecedor in ('funcionario','corretor','prestador_servico'));
