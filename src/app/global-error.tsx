"use client"; // Limites de erro precisam ser Client Components

// Última linha de defesa: só aparece se o próprio layout raiz falhar.
// Precisa ter <html>/<body> próprios e não recebe o CSS global, por isso
// os estilos estão inline.
export default function ErroGlobal({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#faf9f7",
          color: "#1c1917",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
        }}
      >
        <title>Vitral | Erro</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>O Vitral teve um problema ao carregar</h1>
          <p style={{ fontSize: 14, color: "#57534e" }}>
            Tente de novo em instantes.
            {error.digest ? ` Código: ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 16,
              background: "#731515",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
