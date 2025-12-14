export interface ApiError {
  code: string;
  message: string;
  detail?: string | object;
}

export interface ApiResult<T> {
  data: T;
  error?: ApiError;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
