import type { Metadata } from "next";
import { Toast } from "@/components/toast";
import { getFlashToast } from "@/lib/flash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toprock CRM",
  description: "A lightweight CRM for SMB AI agencies built with Next.js and Neon.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flashToast = await getFlashToast();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full text-slate-900">
        {children}
        {flashToast ? <Toast message={flashToast} /> : null}
      </body>
    </html>
  );
}
