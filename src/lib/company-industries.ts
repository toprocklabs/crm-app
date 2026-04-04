export const companyIndustries = [
  "Retail",
  "Automotive",
  "Healthcare",
  "Manufacturing",
] as const;

export type CompanyIndustry = (typeof companyIndustries)[number];
