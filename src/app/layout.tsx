import type { Metadata } from "next";
import { Toast } from "@/components/toast";
import { getFlashToast } from "@/lib/flash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toprock OS",
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
            // Falls back to the pre-plan-008 key so the rename doesn't silently
            // reset everyone's sidebar. Drop the fallback after a release.
            __html: `try{var s=localStorage.getItem("toprock.sidebar-collapsed")??localStorage.getItem("crm.sidebar-collapsed");document.documentElement.dataset.sidebar=s==="1"?"collapsed":"expanded"}catch(e){}`,
          }}
        />
        {children}
        {flashToast ? <Toast message={flashToast} /> : null}
      </body>
    </html>
  );
}
