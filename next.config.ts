import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    // Uma tela visitada fica guardada no navegador por 30 segundos: voltar
    // a ela nesse intervalo abre na hora, sem nova ida ao servidor. Toda
    // ação que salva (revalidatePath, avisar) descarta o que está guardado,
    // então quem salvou vê o dado novo imediatamente.
    staleTimes: { dynamic: 30 },
  },
  // Cabeçalhos de proteção em todas as respostas. Só o próprio Vitral pode
  // abrir suas páginas dentro de um quadro (as prévias de PDF fazem isso);
  // outro site não consegue embutir a tela de assinatura para enganar quem
  // assina. Câmera, microfone e localização ficam desligados.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
