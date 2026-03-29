export function CallLink({
  phone,
  className = "",
}: {
  phone: string | null;
  className?: string;
}) {
  if (!phone) {
    return null;
  }

  const telValue = phone.replace(/[^\d+]/g, "");
  if (!telValue) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <a
        href={`tel:${telValue}`}
        className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Call
      </a>
      <a
        href={`sms:${telValue}`}
        className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Text
      </a>
    </span>
  );
}
