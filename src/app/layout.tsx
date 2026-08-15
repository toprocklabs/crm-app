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
        {/* Apply the stored sidebar width before first paint so a collapsed
            sidebar never flashes open on navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.sidebar=localStorage.getItem("crm.sidebar-collapsed")==="1"?"collapsed":"expanded"}catch(e){}`,
          }}
        />
        {children}
        {flashToast ? <Toast message={flashToast} /> : null}
      </body>
    </html>
  );
}
