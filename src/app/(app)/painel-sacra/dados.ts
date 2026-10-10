import "server-only";
import type { VendaHistoricaVgv, CorretorVgv } from "@/lib/vgv-empresa";

export const TENANT_SACRA = "fc91a390-af99-4357-95e1-e173a8213abf";
export const METRICAS_SACRA = { ano: 2026, metaCentavos: 7_000_000_000 };

// Vendas de 2025 ainda ativas por pendências, confirmadas pelo usuário em 09/10/2026.
// A data de criação do processo não deve incluí-las nas métricas de 2026.
// Vínculos por UUID: outras vendas futuras no mesmo empreendimento continuam elegíveis.
export const PROCESSOS_FORA_DO_ANO = [
  "09ab8ff7-6645-4c72-aed4-57a4ba7be308", // Oasis 1802A
  "bea2f434-cc60-4a96-ad29-072c404ade49", // Bouganville 401 (já datado em 2025)
] as const;

// Fonte: aba 💰 Comissões 2026, B4:H60, arquivo enviado em 09/10/2026.
// SHA-256: 4edcb2ccdc2e06b083a8a7cbfb2374255397862bd4771ea6d031f2b066f3b38a
// Linhas 57 (Costa Verde), 58 (Golden Park) e 60 (segunda QI 10) fora
// do saldo histórico: entram somente pelo cadastro de venda.
// QE 12 (linha 59) e primeira QI 10 (linha 31) já vinculadas por UUID.
// Casa Arniqueiras = Jardim das Oliveiras, confirmado pelo usuário.
// Outros vínculos conferidos por imóvel e valor, nunca só pelo preço.
export const HISTORICO_VGV: readonly VendaHistoricaVgv[] = [
  {
    "linha": 4,
    "valorCentavos": 123000000,
    "participantesIds": []
  },
  {
    "linha": 5,
    "valorCentavos": 59500000,
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1",
      "84bb35db-05bc-40a1-a930-64da46bde791"
    ]
  },
  {
    "linha": 6,
    "valorCentavos": 31000000,
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 7,
    "valorCentavos": 89200000,
    "participantesIds": [
      "84bb35db-05bc-40a1-a930-64da46bde791",
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 8,
    "valorCentavos": 35000000,
    "participantesIds": []
  },
  {
    "linha": 9,
    "valorCentavos": 115000000,
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 10,
    "valorCentavos": 117000000,
    "participantesIds": []
  },
  {
    "linha": 11,
    "valorCentavos": 135000000,
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 12,
    "valorCentavos": 127500000,
    "participantesIds": []
  },
  {
    "linha": 13,
    "valorCentavos": 49000000,
    "participantesIds": [
      "84bb35db-05bc-40a1-a930-64da46bde791"
    ]
  },
  {
    "linha": 14,
    "valorCentavos": 120000000,
    "participantesIds": []
  },
  {
    "linha": 15,
    "valorCentavos": 129000000,
    "processoId": "d0ddd897-4fc6-4252-8e13-0738202e28a5",
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135"
    ]
  },
  {
    "linha": 16,
    "valorCentavos": 107000000,
    "processoId": "fce7ac3c-9d76-41af-8861-536af7419be0",
    "participantesIds": []
  },
  {
    "linha": 17,
    "valorCentavos": 28000000,
    "participantesIds": []
  },
  {
    "linha": 18,
    "valorCentavos": 69000000,
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135"
    ]
  },
  {
    "linha": 19,
    "valorCentavos": 58500000,
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135"
    ]
  },
  {
    "linha": 20,
    "valorCentavos": 53000000,
    "participantesIds": []
  },
  {
    "linha": 21,
    "valorCentavos": 112905000,
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 22,
    "valorCentavos": 31000000,
    "processoId": "6d4ef92d-430e-402c-b109-20499979e966",
    "participantesIds": []
  },
  {
    "linha": 23,
    "valorCentavos": 37000000,
    "participantesIds": []
  },
  {
    "linha": 24,
    "valorCentavos": 260000000,
    "processoId": "79d6582a-7a02-44b5-9714-f01981a8a9ec",
    "participantesIds": []
  },
  {
    "linha": 25,
    "valorCentavos": 19000000,
    "processoId": "cd556dae-08d4-477e-a574-435083b63d44",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 26,
    "valorCentavos": 36000000,
    "participantesIds": []
  },
  {
    "linha": 27,
    "valorCentavos": 136500000,
    "processoId": "40e87e22-4e96-4704-b9e7-a840daf962bc",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1",
      "a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7"
    ]
  },
  {
    "linha": 28,
    "valorCentavos": 36000000,
    "processoId": "7e6647e9-8ac5-4523-898a-f16d220499fc",
    "participantesIds": []
  },
  {
    "linha": 29,
    "valorCentavos": 44500000,
    "processoId": "6b65b4c3-524e-4e41-aa6d-cfbc965cdc98",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 30,
    "valorCentavos": 140000000,
    "processoId": "019c3adf-e752-4de6-9468-cc28d4b13ea2",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 31,
    "valorCentavos": 42560000,
    "processoId": "c9de2c13-3a4e-47ac-95a8-b3bf994cf9de",
    "participantesIds": [
      "84bb35db-05bc-40a1-a930-64da46bde791"
    ]
  },
  {
    "linha": 32,
    "valorCentavos": 146000000,
    "processoId": "4784e5cc-be41-4616-a66c-4ed837f7bab4",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 33,
    "valorCentavos": 113000000,
    "processoId": "0383d659-9d80-479f-b536-07e707db7aa6",
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135"
    ]
  },
  {
    "linha": 34,
    "valorCentavos": 306000000,
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 35,
    "valorCentavos": 33500000,
    "participantesIds": [
      "a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7"
    ]
  },
  {
    "linha": 36,
    "valorCentavos": 52500000,
    "participantesIds": [
      "a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7"
    ]
  },
  {
    "linha": 37,
    "valorCentavos": 135000000,
    "processoId": "c2df96fb-550e-43ae-8d74-8426f774af77"
  },
  {
    "linha": 38,
    "valorCentavos": 115000000,
    "processoId": "87457e0f-731f-4d7f-bfc9-dd508d04d6fa",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 39,
    "valorCentavos": 120000000,
    "processoId": "06af65b0-2e72-4e5b-a8f9-b00240ad0385",
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135",
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 40,
    "valorCentavos": 40000000,
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135",
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 41,
    "valorCentavos": 20000000,
    "participantesIds": [
      "a3c3886d-224e-41ca-9d28-1039abfa2135",
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 42,
    "valorCentavos": 22000000,
    "processoId": "cde3e2ad-4ce1-4e61-a4e2-4432053ed339",
    "participantesIds": [
      "84bb35db-05bc-40a1-a930-64da46bde791"
    ]
  },
  {
    "linha": 43,
    "valorCentavos": 86000000,
    "processoId": "d90b39e0-67c9-45ea-8fc9-613050b3cc00",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 44,
    "valorCentavos": 23500000,
    "processoId": "c26fccec-70fd-4094-b8bd-54c623c18566",
    "participantesIds": [
      "84bb35db-05bc-40a1-a930-64da46bde791"
    ]
  },
  {
    "linha": 45,
    "valorCentavos": 63000000,
    "processoId": "aaa1eef6-e632-4e56-8996-7c33781c83d1",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 46,
    "valorCentavos": 189000000,
    "processoId": "e2a220cd-b273-40a5-b31e-3aada09b474f",
    "participantesIds": [
      "b4fc0664-58e9-43db-a7c5-4563812f00e1"
    ]
  },
  {
    "linha": 47,
    "valorCentavos": 36500000,
    "processoId": "375fa000-bcfa-4219-a8d8-17ede0ba6862",
    "participantesIds": [
      "a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7"
    ]
  },
  {
    "linha": 48,
    "valorCentavos": 43000000,
    "processoId": "353c075c-fa24-4bdc-b421-d52f08f0f9bd",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 49,
    "valorCentavos": 174500000,
    "processoId": "eb42234c-40bf-4f2a-9f69-977aa092e39d",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 50,
    "valorCentavos": 30800000,
    "processoId": "dac7b01b-9126-43c1-a19c-69baa3db5cfd"
  },
  {
    "linha": 51,
    "valorCentavos": 91000000,
    "processoId": "492f83b8-98e1-4b27-a0bc-9d6b9919a00e"
  },
  {
    "linha": 52,
    "valorCentavos": 102000000,
    "processoId": "797a13c8-b3d8-4a07-ae6d-c1bf66f893af",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 53,
    "valorCentavos": 44000000,
    "processoId": "59e77ac1-fd8b-4672-8172-1c361befe5bd",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  },
  {
    "linha": 54,
    "valorCentavos": 58000000,
    "processoId": "f106fe4b-0851-4ab9-ae83-8c2eb8664186",
    "participantesIds": []
  },
  {
    "linha": 55,
    "valorCentavos": 127000000,
    "processoId": "17a4cb31-3fff-4702-af13-94d4e6545790",
    "participantesIds": []
  },
  {
    "linha": 56,
    "valorCentavos": 112000000,
    "participantesIds": []
  },
  {
    "linha": 59,
    "valorCentavos": 43500000,
    "processoId": "440d6abf-ce0b-4030-89f4-acb387ed736a",
    "participantesIds": [
      "d96cd9a0-be85-417e-b9c2-40eebcc4dc43"
    ]
  }
];

// Equipe confirmada pelo usuário. Não inferir participação por login.
export const CORRETORES_SACRA: readonly CorretorVgv[] = [
  {
    "id": "b4fc0664-58e9-43db-a7c5-4563812f00e1",
    "nome": "Amanda"
  },
  {
    "id": "d96cd9a0-be85-417e-b9c2-40eebcc4dc43",
    "nome": "Camila"
  },
  {
    "id": "a3c3886d-224e-41ca-9d28-1039abfa2135",
    "nome": "Michele"
  },
  {
    "id": "84bb35db-05bc-40a1-a930-64da46bde791",
    "nome": "Plínio",
    "aliases": [
      "5e0f9b65-4b9b-4e1d-959e-7fc62ef77fb0"
    ]
  },
  {
    "id": "a44dfe9a-5ccd-4c9c-bf8e-0ef912f7a6b7",
    "nome": "Ricardo"
  }
];
