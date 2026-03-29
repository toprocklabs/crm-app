export const companyIndustries = [
  "Retail",
  "Automotive",
  "Healthcare",
] as const;

export type CompanyIndustry = (typeof companyIndustries)[number];
