"use client";

import { useEffect, useState } from "react";

export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.cookie = "flash_toast=; Max-Age=0; Path=/; SameSite=Lax";
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slideIn_200ms_ease] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
      {message}
    </div>
  );
}
