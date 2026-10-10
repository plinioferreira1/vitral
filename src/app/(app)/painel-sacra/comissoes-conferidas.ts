import "server-only";
import type { ComissaoConferidaVgc } from "@/lib/vgc-empresa";

// Retrato da auditoria de 10/10/2026: Sacra + equipe da época, sem parceiros.
// Sem inferir comissão a partir do VGV; parcelas/gestão internas já incluídas não se repetem.
// Noroeste, Waldivino e Real Park 219: valores integrais confirmados pelo usuário.
// Valores gerados, sem afirmar recebimento. Pendências ficam fora do subtotal apurado.
export const COMISSOES_CONFERIDAS: readonly ComissaoConferidaVgc[] = [
  {
    "id": "contrato-2026-1",
    "ano": 2026,
    "imovel": "Bem-te-vi 1603",
    "valorCentavos": 1845000,
    "fonte": "https://drive.google.com/file/d/1yJWhX7pd7jam_Po2FgJAbKJqFf0YyE4Q/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-2",
    "ano": 2026,
    "imovel": "Cruzeiro Ap 204",
    "valorCentavos": 2380000,
    "fonte": "https://drive.google.com/file/d/1o8BLhvrATXXbbLx6xAACMkBYDwmaifQw/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-3",
    "ano": 2026,
    "imovel": "Madison 911",
    "valorCentavos": 1240000,
    "fonte": "https://drive.google.com/file/d/1Hj4vFO3gGdDbuRcjsV-ikV3XGCNhZAPb/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-4",
    "ano": 2026,
    "imovel": "Olympique 702",
    "valorCentavos": 3568000,
    "fonte": "https://drive.google.com/file/d/1-mgy3rZbuaHKBcoFkBEbwlt-zSiaoSuH/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-5",
    "ano": 2026,
    "imovel": "Piazza Di Spagna 107",
    "valorCentavos": 700000,
    "fonte": "https://drive.google.com/file/d/1UsWWaKlta02wZ4BgCOGi4oMaVJj4uhu_/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-6",
    "ano": 2026,
    "imovel": "Splendido 1802",
    "valorCentavos": 3450000,
    "fonte": "https://drive.google.com/file/d/1H2J-H3I_Qu9UK44yjjkZP4h2T655d6UK/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-7",
    "ano": 2026,
    "imovel": "Gavino 501",
    "valorCentavos": 2340000,
    "fonte": "https://drive.google.com/file/d/1-Ttpp2IndsFui7z5IndKJ3TNabyk0jIT/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-8",
    "ano": 2026,
    "imovel": "Le ciel ",
    "valorCentavos": 4725000,
    "fonte": "https://drive.google.com/file/d/10z8up7EWwRv-vbVJoxyKf6Vm-IP46qfU/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-9",
    "ano": 2026,
    "imovel": "Res 336 - 605",
    "valorCentavos": 2400000,
    "fonte": "https://drive.google.com/file/d/1c_T2YmpOCA9R4BlpOiv7cRJHJvHg5Tmh/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-10",
    "ano": 2026,
    "imovel": "Res Plaza ",
    "valorCentavos": 753000,
    "fonte": "https://drive.google.com/file/d/1HJuti4JYTYv1spPB0ryV3TH6qfLJNC2u/view?usp=drivesdk",
    "pendencia": "Rateios somam R$ 14.880,00; total declarado R$ 14.700,00. VGC detalhado R$ 7.530,00, sem presumir qual parcela corrigir."
  },
  {
    "id": "contrato-2026-11",
    "ano": 2026,
    "imovel": "Grauna 602B",
    "valorCentavos": 2400000,
    "fonte": "https://drive.google.com/file/d/1jAl-tVab3Wc00OUUPgyDTY3Givqymv_l/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-12",
    "ano": 2026,
    "imovel": "Grauna 901",
    "valorCentavos": 2000000,
    "fonte": "https://drive.google.com/file/d/1ivy496qXL0i7NEjhG7SAwJkrfCZx8tiL/view?usp=drivesdk",
    "processoId": "d0ddd897-4fc6-4252-8e13-0738202e28a5"
  },
  {
    "id": "contrato-2026-13",
    "ano": 2026,
    "imovel": "Jales Machado ",
    "valorCentavos": 4280000,
    "fonte": "https://drive.google.com/file/d/15bIrQU_-Uwz5jN0mvVt_J2OOG0nIIzPE/view?usp=drivesdk",
    "processoId": "fce7ac3c-9d76-41af-8861-536af7419be0"
  },
  {
    "id": "contrato-2026-14",
    "ano": 2026,
    "imovel": "Mirante Jequitiba",
    "valorCentavos": 700000,
    "fonte": "https://drive.google.com/file/d/1z0yhv0HhJftOFUgZGN6B3xTtfnEsL6W8/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-15",
    "ano": 2026,
    "imovel": "Real Brasil ",
    "valorCentavos": 1700000,
    "fonte": "https://drive.google.com/file/d/1CdCiGUbNOIkAJFyBd_tTdpYgz5Bp3A4o/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-16",
    "ano": 2026,
    "imovel": "Real Splendor ",
    "valorCentavos": 1412500,
    "fonte": "https://drive.google.com/file/d/1SEJKYKbuaSUbVs_mai18J1Qo1lvNIrxM/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-17",
    "ano": 2026,
    "imovel": "Wave",
    "valorCentavos": 1000000,
    "fonte": "https://drive.google.com/file/d/1eS7r-dJejPE8xgk-b3dAzLmLq0tlDfNj/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-18",
    "ano": 2026,
    "imovel": "Casa Pedra",
    "valorCentavos": 2047500,
    "fonte": "https://drive.google.com/file/d/1EVPmpJKg9GpyJ_-oR-r02g6xSsfilece/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-19",
    "ano": 2026,
    "imovel": "Citta",
    "valorCentavos": 700000,
    "fonte": "https://drive.google.com/file/d/17LBLJU6_LI5hQhlcGunj8QyQJeoqv_Xe/view?usp=drivesdk",
    "processoId": "6d4ef92d-430e-402c-b109-20499979e966"
  },
  {
    "id": "contrato-2026-20",
    "ano": 2026,
    "imovel": "Via Turim 701",
    "valorCentavos": 740000,
    "fonte": "https://drive.google.com/file/d/1KJ68DMNxs2pRYzzcTCnlba6RiRmDpOzI/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-21",
    "ano": 2026,
    "imovel": "Casa Arniqueiras",
    "valorCentavos": 5200000,
    "fonte": "https://drive.google.com/file/d/1EwLovsrfDUDGtAYo3RErdY73uFWd4TxM/view?usp=drivesdk",
    "processoId": "79d6582a-7a02-44b5-9714-f01981a8a9ec"
  },
  {
    "id": "contrato-2026-22",
    "ano": 2026,
    "imovel": "CLSW 504 BL B",
    "valorCentavos": 712500,
    "fonte": "https://drive.google.com/file/d/1B3PVSLVNFSFb1TwdseaMAN1Y5p02PCXX/view?usp=drivesdk",
    "processoId": "cd556dae-08d4-477e-a574-435083b63d44"
  },
  {
    "id": "contrato-2026-23",
    "ano": 2026,
    "imovel": "Lote VP",
    "valorCentavos": 900000,
    "fonte": "https://drive.google.com/file/d/1ij8SPf8LzS1V0ISZjXcoZqLrrlXbWO2D/view?usp=drivesdk"
  },
  {
    "id": "contrato-2026-24",
    "ano": 2026,
    "imovel": "SQN 216",
    "valorCentavos": 5460000,
    "fonte": "https://drive.google.com/file/d/1zbEVm61gFHAeCFZ83y4-a0BbswO5wXlv/view?usp=drivesdk",
    "processoId": "40e87e22-4e96-4704-b9e7-a840daf962bc"
  },
  {
    "id": "contrato-2026-25",
    "ano": 2026,
    "imovel": "Via Turim 607",
    "valorCentavos": 1440000,
    "fonte": "https://drive.google.com/file/d/1ySDF5F1rfkgovrrbKNY7uPclAMUKDsFb/view?usp=drivesdk",
    "processoId": "7e6647e9-8ac5-4523-898a-f16d220499fc",
    "pendencia": "PDF assinado com imagem cortada; versão sem assinatura informa R$ 14.400,00 integralmente para Sacra + equipe. Requer confirmação."
  },
  {
    "id": "contrato-2026-26",
    "ano": 2026,
    "imovel": "Bella Vida 307B",
    "valorCentavos": 750000,
    "fonte": "https://drive.google.com/file/d/1sS4QP4wO7SR7BTBKoA8UfTITb20h15iZ/view?usp=drivesdk",
    "processoId": "6b65b4c3-524e-4e41-aa6d-cfbc965cdc98"
  },
  {
    "id": "contrato-2026-27",
    "ano": 2026,
    "imovel": "Casa Remanso",
    "valorCentavos": 5600000,
    "fonte": "https://drive.google.com/file/d/1fjKZhSriPzowng4QQTmIYvQGV2rhkFmM/view?usp=drivesdk",
    "processoId": "019c3adf-e752-4de6-9468-cc28d4b13ea2"
  },
  {
    "id": "contrato-2026-28",
    "ano": 2026,
    "imovel": "QI 10 Bloco T",
    "valorCentavos": 851200,
    "fonte": "https://drive.google.com/file/d/1VaU36w_rDyfaA9w0XLtnUoNu4hyBJDOP/view?usp=drivesdk",
    "processoId": "c9de2c13-3a4e-47ac-95a8-b3bf994cf9de"
  },
  {
    "id": "contrato-2026-29",
    "ano": 2026,
    "imovel": "Via Majestic",
    "valorCentavos": 2920000,
    "fonte": "https://drive.google.com/file/d/1VjY8VEG3oY_wwztlektSu1tpDqqZOhBI/view?usp=drivesdk",
    "processoId": "4784e5cc-be41-4616-a66c-4ed837f7bab4"
  },
  {
    "id": "contrato-2026-30",
    "ano": 2026,
    "imovel": "Via Palácio",
    "valorCentavos": 1977500,
    "fonte": "https://drive.google.com/file/d/1Nk2hDUuvEZJlHDgNfzhscJ_oN3Ng8DYp/view?usp=drivesdk",
    "processoId": "0383d659-9d80-479f-b536-07e707db7aa6"
  },
  {
    "id": "contrato-2026-31",
    "ano": 2026,
    "imovel": "Cobertura Noroeste",
    "valorCentavos": 6120000,
    "fonte": "https://docs.google.com/spreadsheets/d/1DH7BZMBIMAzeO88gGdnLAouvGjfVjPHCXXo2AnyT2fs/edit#gid=493273814"
  },
  {
    "id": "contrato-2026-32",
    "ano": 2026,
    "imovel": "Real Park",
    "valorCentavos": 1675000,
    "fonte": "https://docs.google.com/spreadsheets/d/1DH7BZMBIMAzeO88gGdnLAouvGjfVjPHCXXo2AnyT2fs/edit#gid=493273814"
  },
  {
    "id": "contrato-2026-33",
    "ano": 2026,
    "imovel": "Chácara Waldivino",
    "valorCentavos": 2625000,
    "fonte": "https://docs.google.com/spreadsheets/d/1DH7BZMBIMAzeO88gGdnLAouvGjfVjPHCXXo2AnyT2fs/edit#gid=493273814"
  },
  {
    "id": "contrato-2026-34",
    "ano": 2026,
    "imovel": "Scorpius",
    "valorCentavos": 2700000,
    "fonte": "https://drive.google.com/file/d/1O7no0EwMK-oCMNwHrwm5CUi6gcSi1C_k/view?usp=drivesdk",
    "processoId": "c2df96fb-550e-43ae-8d74-8426f774af77"
  },
  {
    "id": "contrato-2026-35",
    "ano": 2026,
    "imovel": "QE 50",
    "valorCentavos": 3241947,
    "fonte": "https://drive.google.com/file/d/1QM--zZEqNVxOPLUAn9zs-3ele-K4OjGZ/view?usp=drivesdk",
    "processoId": "87457e0f-731f-4d7f-bfc9-dd508d04d6fa"
  },
  {
    "id": "contrato-2026-36",
    "ano": 2026,
    "imovel": "Casa Park Way",
    "valorCentavos": 4208000,
    "fonte": "https://drive.google.com/file/d/1m5O6Ak3-mcnT96nJOCtd6-H6kJijZL_L/view?usp=drivesdk",
    "processoId": "06af65b0-2e72-4e5b-a8f9-b00240ad0385",
    "pendencia": "Permuta: comissão Park Way declarada R$ 42.000,00, rateio detalhado R$ 42.080,00. As outras duas propriedades têm comissões próprias, não são novas cópias deste valor."
  },
  {
    "id": "contrato-2026-37",
    "ano": 2026,
    "imovel": "Casa Samambaia",
    "valorCentavos": 1400000,
    "fonte": "https://drive.google.com/file/d/1m5O6Ak3-mcnT96nJOCtd6-H6kJijZL_L/view?usp=drivesdk",
    "processoId": "cc0b4444-24c5-4bb3-8c62-4237af2163ae"
  },
  {
    "id": "contrato-2026-38",
    "ano": 2026,
    "imovel": "Loja Aguas",
    "valorCentavos": 700000,
    "fonte": "https://drive.google.com/file/d/1m5O6Ak3-mcnT96nJOCtd6-H6kJijZL_L/view?usp=drivesdk",
    "processoId": "f8e0dffb-507d-434e-91d7-83f9fb53a3a9"
  },
  {
    "id": "contrato-2026-39",
    "ano": 2026,
    "imovel": "Centro C. Park Way",
    "valorCentavos": 440000,
    "fonte": "https://drive.google.com/file/d/1gQQWHNF6ox2G132Or2fh5vLnE4Qre28T/view?usp=drivesdk",
    "processoId": "cde3e2ad-4ce1-4e61-a4e2-4432053ed339"
  },
  {
    "id": "contrato-2026-40",
    "ano": 2026,
    "imovel": "Residencial Pinheiros",
    "valorCentavos": 4300000,
    "fonte": "https://drive.google.com/file/d/1DFmdaPqRLh7fFDJ7IMOJnfo3L4gOnLG1/view?usp=drivesdk",
    "processoId": "d90b39e0-67c9-45ea-8fc9-613050b3cc00"
  },
  {
    "id": "contrato-2026-41",
    "ano": 2026,
    "imovel": "Madison 303A",
    "valorCentavos": 587500,
    "fonte": "https://drive.google.com/file/d/1NL7nmWgYWxqh9NVOr2dcFNByIzvFqvSQ/view?usp=drivesdk",
    "processoId": "c26fccec-70fd-4094-b8bd-54c623c18566"
  },
  {
    "id": "contrato-2026-42",
    "ano": 2026,
    "imovel": "Residencial Barcelona",
    "valorCentavos": 3150000,
    "fonte": "https://drive.google.com/file/d/1p0y4BqOXGhOrdfifF-iXMELIA-JrkKGs/view?usp=drivesdk",
    "processoId": "aaa1eef6-e632-4e56-8996-7c33781c83d1"
  },
  {
    "id": "contrato-2026-43",
    "ano": 2026,
    "imovel": "SQS 208",
    "valorCentavos": 3780000,
    "fonte": "https://drive.google.com/file/d/12M3yebUbXQu6MyYwLFoIfBihF54Fx97B/view?usp=drivesdk",
    "processoId": "e2a220cd-b273-40a5-b31e-3aada09b474f"
  },
  {
    "id": "contrato-2026-44",
    "ano": 2026,
    "imovel": "Real Park 21",
    "valorCentavos": 912500,
    "fonte": "https://drive.google.com/file/d/1B8QV7QumTELzCLXxOx2o7BX3F6_C0X8O/view?usp=drivesdk",
    "processoId": "375fa000-bcfa-4219-a8d8-17ede0ba6862"
  },
  {
    "id": "contrato-2026-45",
    "ano": 2026,
    "imovel": "Atol das Rocas",
    "valorCentavos": 1000000,
    "fonte": "https://drive.google.com/file/d/1IQjpCJ0dPRhBRn3QwWAYJhtrkwUa-Ri7/view?usp=drivesdk",
    "processoId": "353c075c-fa24-4bdc-b421-d52f08f0f9bd"
  },
  {
    "id": "contrato-2026-46",
    "ano": 2026,
    "imovel": "Villa Jardins",
    "valorCentavos": 4083300,
    "fonte": "https://drive.google.com/file/d/1og3EdtsMdbfqrKzfI8Zcq8Ulu994vTjO/view?usp=drivesdk",
    "processoId": "eb42234c-40bf-4f2a-9f69-977aa092e39d"
  },
  {
    "id": "contrato-2026-47",
    "ano": 2026,
    "imovel": "Real Celebration 411C",
    "valorCentavos": 616000,
    "fonte": "https://drive.google.com/file/d/13ymD-PGy0RhckQJmHzDOR4CBlx62a_Mh/view?usp=drivesdk",
    "processoId": "dac7b01b-9126-43c1-a19c-69baa3db5cfd"
  },
  {
    "id": "contrato-2026-48",
    "ano": 2026,
    "imovel": "Oscar Freire",
    "valorCentavos": 1820000,
    "fonte": "https://drive.google.com/file/d/146nIqxKKs1OTQhKz6mFfkX6s1Ww-dDJO/view?usp=drivesdk",
    "processoId": "492f83b8-98e1-4b27-a0bc-9d6b9919a00e"
  },
  {
    "id": "contrato-2026-49",
    "ano": 2026,
    "imovel": "QE 50",
    "valorCentavos": 3570000,
    "fonte": "https://drive.google.com/file/d/1Eq9A-duhQmZaYLQ8XF2tMakI7BlnjNIP/view?usp=drivesdk",
    "processoId": "797a13c8-b3d8-4a07-ae6d-c1bf66f893af"
  },
  {
    "id": "contrato-2026-50",
    "ano": 2026,
    "imovel": "Milena Baqui",
    "valorCentavos": 539000,
    "fonte": "https://drive.google.com/file/d/1drvsRC2M8jhGf35IL429-fsdG-HnBeK0/view?usp=drivesdk",
    "processoId": "59e77ac1-fd8b-4672-8172-1c361befe5bd"
  },
  {
    "id": "contrato-2026-51",
    "ano": 2026,
    "imovel": "Montparnasse",
    "valorCentavos": 2900000,
    "fonte": "https://drive.google.com/file/d/1QDJjxKESiTGHg6XWRdAPTaDmT6MQg_zq/view?usp=drivesdk",
    "processoId": "f106fe4b-0851-4ab9-ae83-8c2eb8664186"
  },
  {
    "id": "contrato-2026-52",
    "ano": 2026,
    "imovel": "Grauna 703A",
    "valorCentavos": 4445000,
    "fonte": "https://drive.google.com/file/d/1uLy1EyORYeRlTmU6IkH5ocYM--gACEPQ/view?usp=drivesdk",
    "processoId": "17a4cb31-3fff-4702-af13-94d4e6545790"
  },
  {
    "id": "contrato-2026-53",
    "ano": 2026,
    "imovel": "Le Essence",
    "valorCentavos": 2240000,
    "fonte": "https://drive.google.com/file/d/1x33pNewaKfeAlAHW49lBoCd2NSL4yvH7/view?usp=drivesdk",
    "processoId": "6e4411d1-1edf-489b-9100-4667915c05d0"
  },
  {
    "id": "contrato-2026-54",
    "ano": 2026,
    "imovel": "Costa Verde",
    "valorCentavos": 799500,
    "fonte": "https://drive.google.com/file/d/1ALdtP5x9S4ja17xVZjySsH8Z_Av1RLoY/view?usp=drivesdk",
    "processoId": "d3206aa1-5bff-46d3-8ec6-d1e477a28bbf"
  },
  {
    "id": "contrato-2026-55",
    "ano": 2026,
    "imovel": "Golden Park",
    "valorCentavos": 860000,
    "fonte": "https://drive.google.com/file/d/1J7pHCrhzbXgCXDCmcYJOArfr4fNvRDQf/view?usp=drivesdk",
    "processoId": "c556773f-f3a2-450e-88f7-10e894580238"
  },
  {
    "id": "contrato-2026-56",
    "ano": 2026,
    "imovel": "QE 12 BL D",
    "valorCentavos": 1740000,
    "fonte": "https://drive.google.com/file/d/1Si2AMIf2AkN32Znwwyp9HluR8PW7XcvR/view?usp=drivesdk",
    "processoId": "440d6abf-ce0b-4030-89f4-acb387ed736a"
  },
  {
    "id": "contrato-2026-57",
    "ano": 2026,
    "imovel": "QI 10 BL T",
    "valorCentavos": 901250,
    "fonte": "https://drive.google.com/file/d/1IMkB3BhVEkcnShnwPqckWM1udinR0DaQ/view?usp=drivesdk",
    "processoId": "da658fe9-4307-4f2d-9462-33d5dfbad465"
  },
  {
    "id": "contrato-2026-58",
    "ano": 2026,
    "imovel": "Modern Life 1305",
    "valorCentavos": 1480000,
    "fonte": "https://drive.google.com/file/d/1kCA1IgTAtkblHz3AMSML4f2Wyc4Z8ifT/view?usp=drivesdk",
    "processoId": "3e241417-a242-4cd9-ac1d-366a146cfac7"
  },
  {
    "id": "contrato-2026-59",
    "ano": 2026,
    "imovel": "Reserva Parque Clube",
    "valorCentavos": 1000000,
    "fonte": "https://drive.google.com/file/d/1nZ3fJGUEaikyvNPnHekPYyJqxhd3ujnQ/view?usp=drivesdk",
    "processoId": "61b1f65d-9566-4758-8e85-e0ce43beab15"
  }
];
