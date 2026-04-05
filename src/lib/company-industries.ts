export const companyIndustries = [
  "Retail",
  "Automotive",
  "Entertainment",
  "Healthcare",
  "Manufacturing",
] as const;

export type CompanyIndustry = (typeof companyIndustries)[number];
