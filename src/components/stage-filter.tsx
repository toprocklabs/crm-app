"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function StageFilter({
  paramName = "stage",
  options,
}: {
  paramName?: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (e.target.value) {
        params.set(paramName, e.target.value);
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [paramName, searchParams, router],
  );

  return (
    <select
      value={current}
      onChange={handleChange}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
    >
      <option value="">All stages</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
