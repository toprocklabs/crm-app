"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function SearchInput({ paramName = "q", placeholder = "Search..." }: { paramName?: string; placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set(paramName, value.trim());
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [value, paramName, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }, [paramName, searchParams, router]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
      />
      {value ? (
        <button type="button" onClick={handleClear} className="text-xs text-slate-500 hover:text-slate-700">
          Clear
        </button>
      ) : null}
      <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
        Search
      </button>
    </form>
  );
}
