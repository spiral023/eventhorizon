export type Company = {
  id: number;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  industry: string;
};

export const companies: Company[] = [
  {
    id: 1,
    name: "RAITEC - Linz",
    address: "Goethestr. 80",
    postalCode: "4040",
    city: "Linz",
    industry: "IT",
  },
];

export const getCompanyById = (id?: number | null) =>
  typeof id === "number" ? companies.find((company) => company.id === id) : undefined;

export const searchCompanies = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return companies.filter((company) => {
    return (
      company.name.toLowerCase().includes(normalized) ||
      company.city.toLowerCase().includes(normalized) ||
      company.industry.toLowerCase().includes(normalized) ||
      company.address.toLowerCase().includes(normalized) ||
      company.postalCode.includes(normalized)
    );
  });
};
