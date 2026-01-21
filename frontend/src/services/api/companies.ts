import type { ApiResult } from "@/types/api";
import type { ApiCompany } from "@/types/apiDomain";
import type { Company } from "@/types/domain";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapCompanyFromApi } from "./mappers";

export async function getCompanies(): Promise<ApiResult<Company[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getCompanies();
  }
  const result = await request<ApiCompany[]>("/companies");
  if (result.data) {
    return { data: result.data.map(mapCompanyFromApi) };
  }
  return { data: [], error: result.error };
}

export async function getCompany(companyId: number): Promise<ApiResult<Company | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getCompany(companyId);
  }
  const result = await request<ApiCompany>(`/companies/${companyId}`);
  if (result.data) {
    return { data: mapCompanyFromApi(result.data) };
  }
  return { data: null, error: result.error };
}
