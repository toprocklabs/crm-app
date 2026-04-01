import { companyIndustries } from "@/lib/company-industries";

export function normalizeCompanyIndustry(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const canonical = companyIndustries.find((industry) => industry.toLowerCase() === trimmed.toLowerCase());
  return canonical ?? trimmed;
}
