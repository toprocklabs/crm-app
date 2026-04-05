import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toprock CRM",
  description: "A lightweight CRM for SMB AI agencies built with Next.js and Neon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full text-slate-900">{children}</body>
    </html>
  );
}
