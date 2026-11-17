import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Escola Conecta — Comunicação Escolar",
  description:
    "Central de comunicação e gestão escolar: avisos, comunicados e notificações em um único ambiente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
