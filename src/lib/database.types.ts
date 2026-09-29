export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      autorizacao_signatarios: {
        Row: {
          assinado_em: string | null
          assinatura_imagem: string | null
          autorizacao_id: string
          id: string
          ip_assinatura: string | null
          nome_digitado: string | null
          nome_esperado: string
          ordem: number
          token: string
        }
        Insert: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          autorizacao_id: string
          id?: string
          ip_assinatura?: string | null
          nome_digitado?: string | null
          nome_esperado: string
          ordem?: number
          token?: string
        }
        Update: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          autorizacao_id?: string
          id?: string
          ip_assinatura?: string | null
          nome_digitado?: string | null
          nome_esperado?: string
          ordem?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizacao_signatarios_autorizacao_id_fkey"
            columns: ["autorizacao_id"]
            isOneToOne: false
            referencedRelation: "autorizacoes_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes_venda: {
        Row: {
          assinado_em: string | null
          comissao_percentual: number | null
          conjuge_id: string | null
          criado_em: string
          criado_por: string | null
          exclusividade: boolean
          foro: string
          id: string
          imovel_id: string
          observacoes: string | null
          prazo_dias: number | null
          processo_id: string | null
          responsavel_id: string | null
          status: string
          tenant_id: string
          valor_imovel: number | null
          vendedor_id: string
        }
        Insert: {
          assinado_em?: string | null
          comissao_percentual?: number | null
          conjuge_id?: string | null
          criado_em?: string
          criado_por?: string | null
          exclusividade?: boolean
          foro?: string
          id?: string
          imovel_id: string
          observacoes?: string | null
          prazo_dias?: number | null
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id: string
          valor_imovel?: number | null
          vendedor_id: string
        }
        Update: {
          assinado_em?: string | null
          comissao_percentual?: number | null
          conjuge_id?: string | null
          criado_em?: string
          criado_por?: string | null
          exclusividade?: boolean
          foro?: string
          id?: string
          imovel_id?: string
          observacoes?: string | null
          prazo_dias?: number | null
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          valor_imovel?: number | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_venda_conjuge_id_fkey"
            columns: ["conjuge_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_venda_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos: {
        Row: {
          contato: string | null
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          contato?: string | null
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          contato?: string | null
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bancos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      carta_proposta_condicoes: {
        Row: {
          carta_proposta_id: string
          descricao: string
          id: string
          ordem: number
          valor: number | null
        }
        Insert: {
          carta_proposta_id: string
          descricao: string
          id?: string
          ordem?: number
          valor?: number | null
        }
        Update: {
          carta_proposta_id?: string
          descricao?: string
          id?: string
          ordem?: number
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carta_proposta_condicoes_carta_proposta_id_fkey"
            columns: ["carta_proposta_id"]
            isOneToOne: false
            referencedRelation: "cartas_proposta"
            referencedColumns: ["id"]
          },
        ]
      }
      carta_proposta_signatarios: {
        Row: {
          assinado_em: string | null
          assinatura_imagem: string | null
          carta_proposta_id: string
          id: string
          ip_assinatura: string | null
          nome_digitado: string | null
          nome_esperado: string
          ordem: number
          token: string
        }
        Insert: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          carta_proposta_id: string
          id?: string
          ip_assinatura?: string | null
          nome_digitado?: string | null
          nome_esperado: string
          ordem?: number
          token?: string
        }
        Update: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          carta_proposta_id?: string
          id?: string
          ip_assinatura?: string | null
          nome_digitado?: string | null
          nome_esperado?: string
          ordem?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "carta_proposta_signatarios_carta_proposta_id_fkey"
            columns: ["carta_proposta_id"]
            isOneToOne: false
            referencedRelation: "cartas_proposta"
            referencedColumns: ["id"]
          },
        ]
      }
      cartas_proposta: {
        Row: {
          assinado_em: string | null
          codigo_san: string | null
          criado_em: string
          criado_por: string | null
          id: string
          imovel_id: string
          observacoes: string | null
          prazo_dias_validade: number
          proponente_id: string
          responsavel_id: string | null
          segundo_proponente_id: string | null
          status: string
          tenant_id: string
          valor_total: number | null
        }
        Insert: {
          assinado_em?: string | null
          codigo_san?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          imovel_id: string
          observacoes?: string | null
          prazo_dias_validade?: number
          proponente_id: string
          responsavel_id?: string | null
          segundo_proponente_id?: string | null
          status?: string
          tenant_id: string
          valor_total?: number | null
        }
        Update: {
          assinado_em?: string | null
          codigo_san?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          imovel_id?: string
          observacoes?: string | null
          prazo_dias_validade?: number
          proponente_id?: string
          responsavel_id?: string | null
          segundo_proponente_id?: string | null
          status?: string
          tenant_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartas_proposta_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartas_proposta_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartas_proposta_proponente_id_fkey"
            columns: ["proponente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartas_proposta_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartas_proposta_segundo_proponente_id_fkey"
            columns: ["segundo_proponente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartas_proposta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_grupo_itens: {
        Row: {
          grupo_id: string
          id: string
          ordem: number
          texto: string
        }
        Insert: {
          grupo_id: string
          id?: string
          ordem?: number
          texto: string
        }
        Update: {
          grupo_id?: string
          id?: string
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_grupo_itens_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "checklist_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_grupos: {
        Row: {
          checklist_id: string
          id: string
          nome: string
          observacao: string | null
          ordem: number
        }
        Insert: {
          checklist_id: string
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number
        }
        Update: {
          checklist_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_grupos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists_modelo"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          descricao: string
          etapa_id: string
          id: string
          ordem: number
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          descricao: string
          etapa_id: string
          id?: string
          ordem?: number
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          descricao?: string
          etapa_id?: string
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_itens_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists_modelo: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_processo"]
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_modelo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cpf_cnpj: string | null
          criado_em: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          rg: string | null
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          criado_em: string
          etapa_id: string | null
          id: string
          processo_id: string
          texto: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          etapa_id?: string | null
          id?: string
          processo_id: string
          texto: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          etapa_id?: string | null
          id?: string
          processo_id?: string
          texto?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          beneficiario_id: string | null
          criado_em: string
          data_prevista: string | null
          data_recebida: string | null
          id: string
          observacoes: string | null
          processo_id: string
          status: string
          valor_previsto: number | null
          valor_recebido: number | null
        }
        Insert: {
          beneficiario_id?: string | null
          criado_em?: string
          data_prevista?: string | null
          data_recebida?: string | null
          id?: string
          observacoes?: string | null
          processo_id: string
          status?: string
          valor_previsto?: number | null
          valor_recebido?: number | null
        }
        Update: {
          beneficiario_id?: string | null
          criado_em?: string
          data_prevista?: string | null
          data_recebida?: string | null
          id?: string
          observacoes?: string | null
          processo_id?: string
          status?: string
          valor_previsto?: number | null
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_locacao: {
        Row: {
          atualizado_em: string
          competencia: string
          contrato_id: string
          id: string
          status: Database["public"]["Enums"]["status_conta_locacao"]
          tipo: Database["public"]["Enums"]["tipo_conta_locacao"]
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          atualizado_em?: string
          competencia: string
          contrato_id: string
          id?: string
          status?: Database["public"]["Enums"]["status_conta_locacao"]
          tipo: Database["public"]["Enums"]["tipo_conta_locacao"]
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          atualizado_em?: string
          competencia?: string
          contrato_id?: string
          id?: string
          status?: Database["public"]["Enums"]["status_conta_locacao"]
          tipo?: Database["public"]["Enums"]["tipo_conta_locacao"]
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_locacao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_locacao"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_locacao: {
        Row: {
          agua_codigo_cliente: string | null
          agua_inscricao: string | null
          ativo: boolean
          condominio_administradora: string | null
          condominio_contato: string | null
          criado_em: string
          data_encerramento: string | null
          emite_nf: boolean
          id: string
          imovel_id: string | null
          iptu_inscricao: string | null
          iptu_tipo: Database["public"]["Enums"]["tipo_iptu_locacao"] | null
          locador_id: string | null
          locatario_id: string | null
          luz_codigo_cliente: string | null
          numero: string
          observacoes: string | null
          portal_administradora_login: string | null
          portal_administradora_senha: string | null
          portal_administradora_url: string | null
          responsavel_agua:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_condominio:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_gas:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_id: string | null
          responsavel_iptu:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_luz:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          tenant_id: string
        }
        Insert: {
          agua_codigo_cliente?: string | null
          agua_inscricao?: string | null
          ativo?: boolean
          condominio_administradora?: string | null
          condominio_contato?: string | null
          criado_em?: string
          data_encerramento?: string | null
          emite_nf?: boolean
          id?: string
          imovel_id?: string | null
          iptu_inscricao?: string | null
          iptu_tipo?: Database["public"]["Enums"]["tipo_iptu_locacao"] | null
          locador_id?: string | null
          locatario_id?: string | null
          luz_codigo_cliente?: string | null
          numero: string
          observacoes?: string | null
          portal_administradora_login?: string | null
          portal_administradora_senha?: string | null
          portal_administradora_url?: string | null
          responsavel_agua?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_condominio?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_gas?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_id?: string | null
          responsavel_iptu?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_luz?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          tenant_id: string
        }
        Update: {
          agua_codigo_cliente?: string | null
          agua_inscricao?: string | null
          ativo?: boolean
          condominio_administradora?: string | null
          condominio_contato?: string | null
          criado_em?: string
          data_encerramento?: string | null
          emite_nf?: boolean
          id?: string
          imovel_id?: string | null
          iptu_inscricao?: string | null
          iptu_tipo?: Database["public"]["Enums"]["tipo_iptu_locacao"] | null
          locador_id?: string | null
          locatario_id?: string | null
          luz_codigo_cliente?: string | null
          numero?: string
          observacoes?: string | null
          portal_administradora_login?: string | null
          portal_administradora_senha?: string | null
          portal_administradora_url?: string | null
          responsavel_agua?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_condominio?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_gas?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_id?: string | null
          responsavel_iptu?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          responsavel_luz?:
            | Database["public"]["Enums"]["responsavel_pagamento_locacao"]
            | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_locacao_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_locacao_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_locacao_locatario_id_fkey"
            columns: ["locatario_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_locacao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_locacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          categorias: Database["public"]["Enums"]["categoria_processo"][]
          criado_em: string
          criado_por: string | null
          email: string
          expira_em: string
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso_usuario"]
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id: string
          token: string
          usado_em: string | null
        }
        Insert: {
          categorias?: Database["public"]["Enums"]["categoria_processo"][]
          criado_em?: string
          criado_por?: string | null
          email: string
          expira_em?: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id: string
          token?: string
          usado_em?: string | null
        }
        Update: {
          categorias?: Database["public"]["Enums"]["categoria_processo"][]
          criado_em?: string
          criado_por?: string | null
          email?: string
          expira_em?: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id?: string
          token?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      corretores: {
        Row: {
          id: string
          nome: string
          percentual_comissao_padrao: number | null
          tenant_id: string
          usuario_id: string | null
        }
        Insert: {
          id?: string
          nome: string
          percentual_comissao_padrao?: number | null
          tenant_id: string
          usuario_id?: string | null
        }
        Update: {
          id?: string
          nome?: string
          percentual_comissao_padrao?: number | null
          tenant_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corretores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          data_prevista: string | null
          data_realizada: string | null
          especial: boolean
          etapa_dependencia_id: string | null
          google_event_id: string | null
          id: string
          modelo_etapa_id: string | null
          nome: string
          numero_registro: string | null
          ordem: number
          processo_id: string
          responsavel_id: string | null
          status: string
        }
        Insert: {
          data_prevista?: string | null
          data_realizada?: string | null
          especial?: boolean
          etapa_dependencia_id?: string | null
          google_event_id?: string | null
          id?: string
          modelo_etapa_id?: string | null
          nome: string
          numero_registro?: string | null
          ordem?: number
          processo_id: string
          responsavel_id?: string | null
          status?: string
        }
        Update: {
          data_prevista?: string | null
          data_realizada?: string | null
          especial?: boolean
          etapa_dependencia_id?: string | null
          google_event_id?: string | null
          id?: string
          modelo_etapa_id?: string | null
          nome?: string
          numero_registro?: string | null
          ordem?: number
          processo_id?: string
          responsavel_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_etapa_dependencia_id_fkey"
            columns: ["etapa_dependencia_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_modelo_etapa_id_fkey"
            columns: ["modelo_etapa_id"]
            isOneToOne: false
            referencedRelation: "modelos_etapa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_padrao: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_processo"]
          criado_em: string
          id: string
          nome: string
          ordem: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_etapa_padrao"]
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_etapa_padrao"]
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_etapa_padrao"]
        }
        Relationships: [
          {
            foreignKeyName: "etapas_padrao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_baixas: {
        Row: {
          conta_bancaria_id: string | null
          criado_em: string
          criado_por: string | null
          data: string
          forma_pagamento: string | null
          gerar_recibo: boolean
          id: string
          lancamento_id: string
          observacoes: string | null
          recibo_documento: string | null
          recibo_emitido_para: string | null
          tenant_id: string
          valor: number
        }
        Insert: {
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data: string
          forma_pagamento?: string | null
          gerar_recibo?: boolean
          id?: string
          lancamento_id: string
          observacoes?: string | null
          recibo_documento?: string | null
          recibo_emitido_para?: string | null
          tenant_id: string
          valor: number
        }
        Update: {
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          forma_pagamento?: string | null
          gerar_recibo?: boolean
          id?: string
          lancamento_id?: string
          observacoes?: string | null
          recibo_documento?: string | null
          recibo_emitido_para?: string | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_baixas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_baixas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_baixas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "financeiro_lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_baixas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_cartoes: {
        Row: {
          ativo: boolean
          banco: string | null
          criado_em: string
          final_digitos: string | null
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          criado_em?: string
          final_digitos?: string | null
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          criado_em?: string
          final_digitos?: string | null
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_cartoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_categorias: {
        Row: {
          centro_custo_padrao_id: string | null
          criado_em: string
          grupo: string | null
          id: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
        }
        Insert: {
          centro_custo_padrao_id?: string | null
          criado_em?: string
          grupo?: string | null
          id?: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
        }
        Update: {
          centro_custo_padrao_id?: string | null
          criado_em?: string
          grupo?: string | null
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["financeiro_tipo_categoria"]
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_categorias_centro_custo_padrao_id_fkey"
            columns: ["centro_custo_padrao_id"]
            isOneToOne: false
            referencedRelation: "financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_centros_custo: {
        Row: {
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_centros_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean
          banco: string | null
          criado_em: string
          data_abertura: string | null
          id: string
          nome: string
          numero_conta: string | null
          saldo_inicial: number
          tenant_id: string
          tipo: string | null
          titular: string | null
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          criado_em?: string
          data_abertura?: string | null
          id?: string
          nome: string
          numero_conta?: string | null
          saldo_inicial?: number
          tenant_id: string
          tipo?: string | null
          titular?: string | null
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          criado_em?: string
          data_abertura?: string | null
          id?: string
          nome?: string
          numero_conta?: string | null
          saldo_inicial?: number
          tenant_id?: string
          tipo?: string | null
          titular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_contas_bancarias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_email_destinatarios: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string | null
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id?: string
          nome?: string | null
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_email_destinatarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_email_envios: {
        Row: {
          destinatarios: string[]
          enviado_em: string
          erro: string | null
          id: string
          resumo: Json | null
          sucesso: boolean
          tenant_id: string
        }
        Insert: {
          destinatarios: string[]
          enviado_em?: string
          erro?: string | null
          id?: string
          resumo?: Json | null
          sucesso: boolean
          tenant_id: string
        }
        Update: {
          destinatarios?: string[]
          enviado_em?: string
          erro?: string | null
          id?: string
          resumo?: Json | null
          sucesso?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_email_envios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_fatura_itens: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          criado_em: string
          data: string
          descricao: string | null
          estabelecimento: string
          fatura_id: string
          id: string
          parcela_atual: number | null
          parcela_total: number | null
          tenant_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          criado_em?: string
          data: string
          descricao?: string | null
          estabelecimento: string
          fatura_id: string
          id?: string
          parcela_atual?: number | null
          parcela_total?: number | null
          tenant_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          criado_em?: string
          data?: string
          descricao?: string | null
          estabelecimento?: string
          fatura_id?: string
          id?: string
          parcela_atual?: number | null
          parcela_total?: number | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fatura_itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fatura_itens_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fatura_itens_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "financeiro_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_fatura_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_faturas: {
        Row: {
          cartao_id: string
          competencia: string
          criado_em: string
          id: string
          tenant_id: string
          vencimento: string | null
        }
        Insert: {
          cartao_id: string
          competencia: string
          criado_em?: string
          id?: string
          tenant_id: string
          vencimento?: string | null
        }
        Update: {
          cartao_id?: string
          competencia?: string
          criado_em?: string
          id?: string
          tenant_id?: string
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_faturas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "financeiro_cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_faturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_lancamentos: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          competencia: string | null
          conta_bancaria_id: string | null
          criado_em: string
          criado_por: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          pessoa_id: string | null
          recorrencia_id: string | null
          status: Database["public"]["Enums"]["financeiro_status_lancamento"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          unidade_id: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          pessoa_id?: string | null
          recorrencia_id?: string | null
          status?: Database["public"]["Enums"]["financeiro_status_lancamento"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          unidade_id?: string | null
          valor: number
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          pessoa_id?: string | null
          recorrencia_id?: string | null
          status?: Database["public"]["Enums"]["financeiro_status_lancamento"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          unidade_id?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "financeiro_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_recorrencia_id_fkey"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "financeiro_recorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "financeiro_unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_pessoas: {
        Row: {
          categoria_fornecedor: string | null
          cpf_cnpj: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          papel: Database["public"]["Enums"]["financeiro_papel_pessoa"]
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          categoria_fornecedor?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          papel?: Database["public"]["Enums"]["financeiro_papel_pessoa"]
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          categoria_fornecedor?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          papel?: Database["public"]["Enums"]["financeiro_papel_pessoa"]
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_pessoas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_recorrencias: {
        Row: {
          ativa: boolean
          categoria_id: string | null
          centro_custo_id: string | null
          conta_bancaria_id: string | null
          criado_em: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_util: number | null
          frequencia: Database["public"]["Enums"]["financeiro_frequencia"]
          id: string
          numero_ocorrencias: number | null
          pessoa_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          tipo_vencimento: string
          unidade_id: string | null
          valor: number
        }
        Insert: {
          ativa?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao: string
          dia_util?: number | null
          frequencia?: Database["public"]["Enums"]["financeiro_frequencia"]
          id?: string
          numero_ocorrencias?: number | null
          pessoa_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          tipo_vencimento?: string
          unidade_id?: string | null
          valor: number
        }
        Update: {
          ativa?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_util?: number | null
          frequencia?: Database["public"]["Enums"]["financeiro_frequencia"]
          id?: string
          numero_ocorrencias?: number | null
          pessoa_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["financeiro_tipo_categoria"]
          tipo_vencimento?: string
          unidade_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_recorrencias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "financeiro_pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_recorrencias_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "financeiro_unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_transferencias: {
        Row: {
          conta_destino_id: string
          conta_origem_id: string
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string | null
          id: string
          tenant_id: string
          valor: number
        }
        Insert: {
          conta_destino_id: string
          conta_origem_id: string
          criado_em?: string
          criado_por?: string | null
          data: string
          descricao?: string | null
          id?: string
          tenant_id: string
          valor: number
        }
        Update: {
          conta_destino_id?: string
          conta_origem_id?: string
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          id?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_transferencias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "financeiro_contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transferencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_unidades: {
        Row: {
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_unidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      historico: {
        Row: {
          acao: string
          criado_em: string
          detalhe: Json | null
          etapa_id: string | null
          id: string
          processo_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhe?: Json | null
          etapa_id?: string | null
          id?: string
          processo_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhe?: Json | null
          etapa_id?: string | null
          id?: string
          processo_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      imoveis: {
        Row: {
          area_construida: string | null
          area_lote: string | null
          cep: string | null
          endereco: string
          id: string
          inscricao_iptu: string | null
          matricula: string | null
          proprietario_id: string | null
          regiao_administrativa: string | null
          tenant_id: string
          tipo: string | null
          valor: number | null
          valor_condominio: number | null
        }
        Insert: {
          area_construida?: string | null
          area_lote?: string | null
          cep?: string | null
          endereco: string
          id?: string
          inscricao_iptu?: string | null
          matricula?: string | null
          proprietario_id?: string | null
          regiao_administrativa?: string | null
          tenant_id: string
          tipo?: string | null
          valor?: number | null
          valor_condominio?: number | null
        }
        Update: {
          area_construida?: string | null
          area_lote?: string | null
          cep?: string | null
          endereco?: string
          id?: string
          inscricao_iptu?: string | null
          matricula?: string | null
          proprietario_id?: string | null
          regiao_administrativa?: string | null
          tenant_id?: string
          tipo?: string | null
          valor?: number | null
          valor_condominio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_checklist_item: {
        Row: {
          descricao: string
          id: string
          modelo_etapa_id: string
          ordem: number
        }
        Insert: {
          descricao: string
          id?: string
          modelo_etapa_id: string
          ordem?: number
        }
        Update: {
          descricao?: string
          id?: string
          modelo_etapa_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "modelos_checklist_item_modelo_etapa_id_fkey"
            columns: ["modelo_etapa_id"]
            isOneToOne: false
            referencedRelation: "modelos_etapa"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_etapa: {
        Row: {
          dias_offset: number
          etapa_referencia_id: string | null
          id: string
          modelo_processo_id: string
          nome: string
          obrigatoria: boolean
          ordem: number
          responsavel_padrao_perfil:
            | Database["public"]["Enums"]["perfil_usuario"]
            | null
          tipo_regra_data: Database["public"]["Enums"]["tipo_regra_data"]
        }
        Insert: {
          dias_offset?: number
          etapa_referencia_id?: string | null
          id?: string
          modelo_processo_id: string
          nome: string
          obrigatoria?: boolean
          ordem: number
          responsavel_padrao_perfil?:
            | Database["public"]["Enums"]["perfil_usuario"]
            | null
          tipo_regra_data?: Database["public"]["Enums"]["tipo_regra_data"]
        }
        Update: {
          dias_offset?: number
          etapa_referencia_id?: string | null
          id?: string
          modelo_processo_id?: string
          nome?: string
          obrigatoria?: boolean
          ordem?: number
          responsavel_padrao_perfil?:
            | Database["public"]["Enums"]["perfil_usuario"]
            | null
          tipo_regra_data?: Database["public"]["Enums"]["tipo_regra_data"]
        }
        Relationships: [
          {
            foreignKeyName: "modelos_etapa_etapa_referencia_id_fkey"
            columns: ["etapa_referencia_id"]
            isOneToOne: false
            referencedRelation: "modelos_etapa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelos_etapa_modelo_processo_id_fkey"
            columns: ["modelo_processo_id"]
            isOneToOne: false
            referencedRelation: "modelos_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_processo: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["categoria_processo"]
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_processo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_dispensadas: {
        Row: {
          criado_em: string
          data_prevista: string
          etapa_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          data_prevista: string
          etapa_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          data_prevista?: string
          etapa_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_dispensadas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_etapas: {
        Row: {
          descricao: string | null
          id: string
          link: string | null
          nome: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          descricao?: string | null
          id?: string
          link?: string | null
          nome: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          descricao?: string | null
          id?: string
          link?: string | null
          nome?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_etapas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_status: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          etapa_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          etapa_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          etapa_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_status_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "onboarding_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_status_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          banco_id: string | null
          categoria: Database["public"]["Enums"]["categoria_processo"]
          codigo_san: string | null
          comprador_id: string | null
          corretor_id: string | null
          criado_em: string
          data_assinatura: string | null
          data_conclusao: string | null
          data_criacao: string
          data_final_contrato: string | null
          google_alerta_contrato: Json
          id: string
          imovel_id: string | null
          indicacao_id: string | null
          modelo_processo_id: string | null
          numero_processo: string
          origem: string | null
          responsavel_id: string | null
          status: string
          tenant_id: string
          tipo: string | null
          valor_financiado: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          banco_id?: string | null
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          codigo_san?: string | null
          comprador_id?: string | null
          corretor_id?: string | null
          criado_em?: string
          data_assinatura?: string | null
          data_conclusao?: string | null
          data_criacao?: string
          data_final_contrato?: string | null
          google_alerta_contrato?: Json
          id?: string
          imovel_id?: string | null
          indicacao_id?: string | null
          modelo_processo_id?: string | null
          numero_processo: string
          origem?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id: string
          tipo?: string | null
          valor_financiado?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          banco_id?: string | null
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          codigo_san?: string | null
          comprador_id?: string | null
          corretor_id?: string | null
          criado_em?: string
          data_assinatura?: string | null
          data_conclusao?: string | null
          data_criacao?: string
          data_final_contrato?: string | null
          google_alerta_contrato?: Json
          id?: string
          imovel_id?: string | null
          indicacao_id?: string | null
          modelo_processo_id?: string | null
          numero_processo?: string
          origem?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string | null
          valor_financiado?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_indicacao_id_fkey"
            columns: ["indicacao_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_modelo_processo_id_fkey"
            columns: ["modelo_processo_id"]
            isOneToOne: false
            referencedRelation: "modelos_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisao_checklist_itens: {
        Row: {
          concluido: boolean
          descricao: string
          etapa_id: string
          id: string
          ordem: number
        }
        Insert: {
          concluido?: boolean
          descricao: string
          etapa_id: string
          id?: string
          ordem?: number
        }
        Update: {
          concluido?: boolean
          descricao?: string
          etapa_id?: string
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "rescisao_checklist_itens_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "rescisao_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisao_etapas: {
        Row: {
          data_prevista: string | null
          data_realizada: string | null
          id: string
          nome: string
          ordem: number
          rescisao_id: string
          responsavel_id: string | null
          status: string
        }
        Insert: {
          data_prevista?: string | null
          data_realizada?: string | null
          id?: string
          nome: string
          ordem?: number
          rescisao_id: string
          responsavel_id?: string | null
          status?: string
        }
        Update: {
          data_prevista?: string | null
          data_realizada?: string | null
          id?: string
          nome?: string
          ordem?: number
          rescisao_id?: string
          responsavel_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescisao_etapas_rescisao_id_fkey"
            columns: ["rescisao_id"]
            isOneToOne: false
            referencedRelation: "rescisoes_locacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisao_etapas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisoes_locacao: {
        Row: {
          concluida_em: string | null
          contrato_id: string
          criado_em: string
          data_aviso: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          concluida_em?: string | null
          contrato_id: string
          criado_em?: string
          data_aviso?: string
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          concluida_em?: string | null
          contrato_id?: string
          criado_em?: string
          data_aviso?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescisoes_locacao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_locacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_locacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes_custas: {
        Row: {
          criado_em: string
          id: string
          instrumento_particular: boolean
          primeiro_imovel: boolean
          tenant_id: string
          tipo_imovel: string
          total: number
          usuario_id: string
          valor: number
          valor_financiado: number | null
        }
        Insert: {
          criado_em?: string
          id?: string
          instrumento_particular?: boolean
          primeiro_imovel?: boolean
          tenant_id: string
          tipo_imovel: string
          total: number
          usuario_id: string
          valor: number
          valor_financiado?: number | null
        }
        Update: {
          criado_em?: string
          id?: string
          instrumento_particular?: boolean
          primeiro_imovel?: boolean
          tenant_id?: string
          tipo_imovel?: string
          total?: number
          usuario_id?: string
          valor?: number
          valor_financiado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_custas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_custas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_mensais: {
        Row: {
          dia_fixo: number | null
          id: string
          nome: string
          ordem: number
          periodicidade: string
          regra: string | null
          tenant_id: string
          tipo_regra: string
        }
        Insert: {
          dia_fixo?: number | null
          id?: string
          nome: string
          ordem?: number
          periodicidade?: string
          regra?: string | null
          tenant_id: string
          tipo_regra?: string
        }
        Update: {
          dia_fixo?: number | null
          id?: string
          nome?: string
          ordem?: number
          periodicidade?: string
          regra?: string | null
          tenant_id?: string
          tipo_regra?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_mensais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_mensais_status: {
        Row: {
          competencia: string
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          id: string
          tarefa_id: string
        }
        Insert: {
          competencia: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          id?: string
          tarefa_id: string
        }
        Update: {
          competencia?: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          id?: string
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_mensais_status_concluida_por_fkey"
            columns: ["concluida_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_mensais_status_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          criado_em: string
          id: string
          nome: string
          whatsapp_contato: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          whatsapp_contato?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          whatsapp_contato?: string | null
        }
        Relationships: []
      }
      termos_visita: {
        Row: {
          assinado_em: string | null
          assinatura_imagem: string | null
          cliente_cpf: string | null
          cliente_id: string
          cliente_rg: string | null
          codigo_imovel: string | null
          corretor_id: string | null
          criado_em: string
          criado_por: string | null
          data_visita: string
          feedback: string | null
          id: string
          imovel_id: string
          ip_assinatura: string | null
          multa_percentual: number
          nome_digitado: string | null
          nota: number | null
          observacoes: string | null
          processo_id: string | null
          status: string
          tenant_id: string
          token: string
          valor_imovel: number | null
        }
        Insert: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          cliente_cpf?: string | null
          cliente_id: string
          cliente_rg?: string | null
          codigo_imovel?: string | null
          corretor_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_visita?: string
          feedback?: string | null
          id?: string
          imovel_id: string
          ip_assinatura?: string | null
          multa_percentual?: number
          nome_digitado?: string | null
          nota?: number | null
          observacoes?: string | null
          processo_id?: string | null
          status?: string
          tenant_id: string
          token?: string
          valor_imovel?: number | null
        }
        Update: {
          assinado_em?: string | null
          assinatura_imagem?: string | null
          cliente_cpf?: string | null
          cliente_id?: string
          cliente_rg?: string | null
          codigo_imovel?: string | null
          corretor_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_visita?: string
          feedback?: string | null
          id?: string
          imovel_id?: string
          ip_assinatura?: string | null
          multa_percentual?: number
          nome_digitado?: string | null
          nota?: number | null
          observacoes?: string | null
          processo_id?: string | null
          status?: string
          tenant_id?: string
          token?: string
          valor_imovel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "termos_visita_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_visita_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_visita_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_visita_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_visita_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_visita_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoriais: {
        Row: {
          categoria: string
          conteudo: string | null
          criado_em: string
          descricao: string | null
          id: string
          link: string | null
          ordem: number
          tenant_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          categoria: string
          conteudo?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          link?: string | null
          ordem?: number
          tenant_id: string
          tipo: string
          titulo: string
        }
        Update: {
          categoria?: string
          conteudo?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          link?: string | null
          ordem?: number
          tenant_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoriais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_categorias: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_processo"]
          usuario_id: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_processo"]
          usuario_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_processo"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_categorias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          criado_em: string
          email: string
          foto_url: string | null
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso_usuario"]
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          criado_em?: string
          email: string
          foto_url?: string | null
          id: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          nome: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          criado_em?: string
          email?: string
          foto_url?: string | null
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_member: {
        Args: {
          p_categorias: Database["public"]["Enums"]["categoria_processo"][]
          p_email: string
          p_nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          p_perfil: Database["public"]["Enums"]["perfil_usuario"]
        }
        Returns: undefined
      }
      assinatura_buscar: {
        Args: { p_token: string }
        Returns: {
          comissao_percentual: number
          conjuge_cpf: string
          conjuge_endereco: string
          conjuge_nome: string
          conjuge_rg: string
          conjuge_telefone: string
          criado_em: string
          exclusividade: boolean
          foro: string
          imovel_area_construida: string
          imovel_area_lote: string
          imovel_cep: string
          imovel_endereco: string
          imovel_inscricao_iptu: string
          imovel_matricula: string
          imovel_valor_condominio: number
          ja_assinado: boolean
          nome_esperado: string
          observacoes: string
          prazo_dias: number
          signatario_id: string
          status_autorizacao: string
          valor_imovel: number
          vendedor_cpf: string
          vendedor_endereco: string
          vendedor_nome: string
          vendedor_rg: string
          vendedor_telefone: string
        }[]
      }
      assinatura_registrar: {
        Args: {
          p_assinatura_imagem: string
          p_ip: string
          p_nome_digitado: string
          p_token: string
        }
        Returns: boolean
      }
      atualizar_categorias_membro: {
        Args: {
          p_categorias: Database["public"]["Enums"]["categoria_processo"][]
          p_nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_usuario"]
          p_usuario_id: string
        }
        Returns: undefined
      }
      auth_tenant_id: { Args: never; Returns: string }
      bootstrap_tenant: { Args: { p_nome_empresa: string }; Returns: string }
      carta_proposta_assinatura_buscar: {
        Args: { p_token: string }
        Returns: {
          codigo_san: string
          condicoes: Json
          criado_em: string
          imovel_endereco: string
          ja_assinado: boolean
          nome_esperado: string
          observacoes: string
          prazo_dias_validade: number
          proponente_cpf: string
          proponente_nome: string
          segundo_proponente_cpf: string
          segundo_proponente_nome: string
          signatario_id: string
          status_proposta: string
          valor_total: number
        }[]
      }
      carta_proposta_assinatura_registrar: {
        Args: {
          p_assinatura_imagem: string
          p_ip: string
          p_nome_digitado: string
          p_token: string
        }
        Returns: boolean
      }
      convite_validar: {
        Args: { p_token: string }
        Returns: {
          email: string
          nome_empresa: string
          valido: boolean
        }[]
      }
      seed_etapas_padrao: { Args: { p_tenant_id: string }; Returns: undefined }
      seed_modelos_padrao: { Args: { p_tenant_id: string }; Returns: undefined }
      termo_visita_buscar: {
        Args: { p_token: string }
        Returns: {
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          codigo_imovel: string
          corretor_nome: string
          data_visita: string
          imovel_endereco: string
          ja_assinado: boolean
          multa_percentual: number
          status_termo: string
          termo_id: string
          valor_imovel: number
        }[]
      }
      termo_visita_registrar: {
        Args: {
          p_assinatura_imagem: string
          p_cpf: string
          p_ip: string
          p_nome_digitado: string
          p_rg: string
          p_token: string
        }
        Returns: boolean
      }
      usuario_eh_gestor: { Args: never; Returns: boolean }
      usuario_pode_criar_documento_cliente: { Args: never; Returns: boolean }
      usuario_pode_editar: { Args: never; Returns: boolean }
      usuario_pode_ver_documento_cliente:
        | {
            Args: {
              p_categoria: Database["public"]["Enums"]["categoria_processo"]
            }
            Returns: boolean
          }
        | {
            Args: {
              p_categoria: Database["public"]["Enums"]["categoria_processo"]
              p_criado_por: string
            }
            Returns: boolean
          }
      usuario_tem_categoria: {
        Args: { p_categoria: Database["public"]["Enums"]["categoria_processo"] }
        Returns: boolean
      }
    }
    Enums: {
      categoria_processo: "venda" | "financiamento" | "locacao" | "marketing"
      financeiro_frequencia:
        | "semanal"
        | "mensal"
        | "trimestral"
        | "semestral"
        | "anual"
      financeiro_papel_pessoa: "cliente" | "fornecedor" | "ambos"
      financeiro_status_lancamento:
        | "pendente"
        | "pago_parcial"
        | "pago"
        | "cancelado"
      financeiro_tipo_categoria: "receita" | "despesa"
      nivel_acesso_usuario:
        | "diretor"
        | "gerente"
        | "supervisor"
        | "auxiliar"
        | "corretor"
        | "gerente_locacao"
        | "social_media"
      perfil_usuario:
        | "admin"
        | "diretora"
        | "gerente"
        | "corretor"
        | "correspondente"
        | "financeiro"
      responsavel_pagamento_locacao: "locador" | "locatario" | "imobiliaria"
      status_conta_locacao: "pago" | "pendente" | "nao_aplicavel"
      tipo_conta_locacao: "iptu" | "condominio" | "agua" | "luz" | "gas"
      tipo_etapa_padrao: "sequencial" | "especial"
      tipo_iptu_locacao: "parcelado" | "cota_unica"
      tipo_regra_data:
        | "fixa"
        | "relativa_criacao"
        | "relativa_etapa_anterior"
        | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_processo: ["venda", "financiamento", "locacao", "marketing"],
      financeiro_frequencia: [
        "semanal",
        "mensal",
        "trimestral",
        "semestral",
        "anual",
      ],
      financeiro_papel_pessoa: ["cliente", "fornecedor", "ambos"],
      financeiro_status_lancamento: [
        "pendente",
        "pago_parcial",
        "pago",
        "cancelado",
      ],
      financeiro_tipo_categoria: ["receita", "despesa"],
      nivel_acesso_usuario: [
        "diretor",
        "gerente",
        "supervisor",
        "auxiliar",
        "corretor",
        "gerente_locacao",
        "social_media",
      ],
      perfil_usuario: [
        "admin",
        "diretora",
        "gerente",
        "corretor",
        "correspondente",
        "financeiro",
      ],
      responsavel_pagamento_locacao: ["locador", "locatario", "imobiliaria"],
      status_conta_locacao: ["pago", "pendente", "nao_aplicavel"],
      tipo_conta_locacao: ["iptu", "condominio", "agua", "luz", "gas"],
      tipo_etapa_padrao: ["sequencial", "especial"],
      tipo_iptu_locacao: ["parcelado", "cota_unica"],
      tipo_regra_data: [
        "fixa",
        "relativa_criacao",
        "relativa_etapa_anterior",
        "manual",
      ],
    },
  },
} as const
