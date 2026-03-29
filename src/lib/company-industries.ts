export const companyIndustries = [
  "Retail",
  "Automotive",
] as const;

export type CompanyIndustry = (typeof companyIndustries)[number];
