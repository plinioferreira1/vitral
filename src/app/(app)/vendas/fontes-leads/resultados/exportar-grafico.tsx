"use client";

import { useState } from "react";

type Fonte = { nome: string; quantidade: number };

export function ExportarGrafico({ ranking, periodo, total }: {
  ranking: Fonte[]; periodo: string; total: number;
}) {
  const [erro, setErro] = useState("");

  const exportar = () => {
    setErro("");
    try {
      const escala = 2;
      const largura = 1120;
      const margem = 64;
      const linhaAltura = 92;
      const altura = Math.max(570, 300 + ranking.length * linhaAltura);
      const canvas = document.createElement("canvas");
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.scale(escala, escala);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, largura, altura);
      ctx.fillStyle = "#123f35";
      ctx.fillRect(0, 0, largura, 12);
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#1c2926";
      ctx.font = "bold 36px Arial, sans-serif";
      ctx.fillText("Fonte de Vendas", margem, 82);
      ctx.fillStyle = "#586b64";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText("Vendas assinadas por origem • " + periodo, margem, 119);
      ctx.fillStyle = "#123f35";
      ctx.font = "bold 24px Arial, sans-serif";
      ctx.fillText(total + (total === 1 ? " venda assinada" : " vendas assinadas"), margem, 172);
      ctx.fillStyle = "#dee6e2";
      ctx.fillRect(margem, 200, largura - 2 * margem, 1);

      if (!ranking.length) {
        ctx.fillStyle = "#586b64";
        ctx.font = "22px Arial, sans-serif";
        ctx.fillText("Nenhuma venda registrada neste período.", margem, 268);
      } else {
        const maior = Math.max(1, ...ranking.map(f => f.quantidade));
        ranking.forEach((fonte, i) => {
          const y = 247 + i * linhaAltura;
          ctx.fillStyle = "#1c2926";
          ctx.font = "bold 20px Arial, sans-serif";
          const nome = fonte.nome.length > 45 ? fonte.nome.slice(0, 42) + "..." : fonte.nome;
          ctx.fillText(nome, margem, y);
          ctx.textAlign = "right";
          ctx.font = "18px Arial, sans-serif";
          const pct = total ? (100 * fonte.quantidade / total).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0";
          ctx.fillText(fonte.quantidade + (fonte.quantidade === 1 ? " venda" : " vendas") + " • " + pct + "%", largura - margem, y);
          ctx.textAlign = "left";
          ctx.fillStyle = "#edf2ef";
          ctx.beginPath();
          ctx.roundRect(margem, y + 18, largura - 2 * margem, 21, 9);
          ctx.fill();
          ctx.fillStyle = fonte.nome === "Não informado" ? "#a1aaa6" : "#185d4d";
          ctx.beginPath();
          ctx.roundRect(margem, y + 18, (largura - 2 * margem) * fonte.quantidade / maior, 21, 9);
          ctx.fill();
        });
      }

      ctx.fillStyle = "#dfe6e1";
      ctx.fillRect(margem, altura - 108, largura - 2 * margem, 1);
      ctx.fillStyle = "#65766f";
      ctx.font = "17px Arial, sans-serif";
      ctx.fillText("Participação sobre o total de vendas assinadas, não taxa de conversão de leads.", margem, altura - 75);
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText("VITRAL • Sacra Netimóveis", margem, altura - 42);
      const link = document.createElement("a");
      link.download = "fonte-de-vendas-" + periodo.toLocaleLowerCase("pt-BR")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-") + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setErro("Não foi possível gerar a imagem. Tente novamente em outro navegador.");
    }
  };

  return <div className="flex flex-col items-start gap-1">
    <button type="button" onClick={exportar}
      className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
      Exportar gráfico (PNG)
    </button>
    {erro && <p role="alert" className="text-xs text-rose-700">{erro}</p>}
  </div>;
}
