import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('selectedCompanyId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (companyId) config.headers['X-Company-Id'] = companyId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ success: boolean; data: { user: unknown; token: string } }>('/auth/login', { username, password }),
  me: () => api.get<{ success: boolean; data: unknown }>('/auth/me'),
};

export const companyApi = {
  list: () => api.get<{ success: boolean; data: unknown[] }>('/companies'),
  get: (id: string) => api.get<{ success: boolean; data: unknown }>(`/companies/${id}`),
  create: (data: Record<string, unknown>) => api.post<{ success: boolean; data: unknown }>('/companies', data),
};

export const financialYearApi = {
  list: (companyId: string) => api.get<{ success: boolean; data: unknown[] }>('/financial-years', { params: { companyId } }),
  getCurrent: (companyId: string) => api.get<{ success: boolean; data: unknown }>('/financial-years/current', { params: { companyId } }),
  setCurrent: (companyId: string, financialYearId: string) =>
    api.post('/financial-years/set-current', { companyId, financialYearId }),
};

export const productApi = {
  list: (companyId: string, params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { products: unknown[]; total: number } }>('/products', { params: { companyId, ...params } }),
  get: (id: string, companyId: string) => api.get<{ success: boolean; data: unknown }>(`/products/${id}`, { params: { companyId } }),
  getByBarcode: (companyId: string, barcode: string) =>
    api.get<{ success: boolean; data: unknown }>('/products/barcode', { params: { companyId, barcode } }),
  getUnits: (companyId: string) => api.get<{ success: boolean; data: unknown[] }>('/products/units', { params: { companyId } }),
  create: (data: Record<string, unknown>) => api.post<{ success: boolean; data: unknown }>('/products', data),
};

export const openingStockApi = {
  post: (data: { companyId: string; financialYearId: string; items: Array<{ productId: string; quantity: number; costPrice: number }> }) =>
    api.post<{ success: boolean; data: unknown }>('/opening-stock', data),
  importProductsAndStock: (
    companyId: string,
    financialYearId: string,
    data: { mapping: Record<string, number>; rows: string[][]; headers: string[] }
  ) =>
    api.post<{ success: boolean; data: { created: number; updated: number; errors: string[] } }>(
      '/opening-stock/import',
      { companyId, financialYearId, ...data }
    ),
};

export const salesApi = {
  createPOS: (data: {
    companyId: string;
    financialYearId: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>;
    paymentDetails: Array<{ mode: string; amount: number }>;
    billDiscount?: number;
  }) => api.post<{ success: boolean; data: { invoiceId: string; invoiceNo: string } }>('/sales/pos', data),
};

export const ledgerApi = {
  trialBalance: (companyId: string, financialYearId: string, asAtDate?: string) =>
    api.get<{ success: boolean; data: { rows: unknown[]; totalDebit: number; totalCredit: number; balanced: boolean } }>(
      '/ledger/trial-balance',
      { params: { companyId, financialYearId, asAtDate } }
    ),
  exportTrialBalance: (companyId: string, financialYearId: string, asAtDate?: string) =>
    api.get('/ledger/trial-balance/export', {
      params: { companyId, financialYearId, asAtDate, format: 'xlsx' },
      responseType: 'blob',
    }),
  report: (companyId: string, financialYearId: string, ledgerAccountId: string, fromDate: string, toDate: string) =>
    api.get<{ success: boolean; data: unknown }>('/ledger/report', {
      params: { companyId, financialYearId, ledgerAccountId, fromDate, toDate },
    }),
  profitLoss: (companyId: string, financialYearId: string, fromDate?: string, toDate?: string) =>
    api.get<{ success: boolean; data: { income: number; expenses: number; netProfit: number; groups: unknown[] } }>(
      '/ledger/profit-loss',
      { params: { companyId, financialYearId, fromDate, toDate } }
    ),
  balanceSheet: (companyId: string, financialYearId: string, asAtDate?: string) =>
    api.get<{ success: boolean; data: { assets: number; liabilities: number; equity: number; balanced: boolean; groups: unknown[] } }>(
      '/ledger/balance-sheet',
      { params: { companyId, financialYearId, asAtDate } }
    ),
};

export const ledgerAccountApi = {
  list: (companyId: string, type?: string, search?: string) =>
    api.get<{ success: boolean; data: unknown[] }>('/ledger-accounts', { params: { companyId, type, search } }),
  get: (id: string, companyId: string) =>
    api.get<{ success: boolean; data: unknown }>(`/ledger-accounts/${id}`, { params: { companyId } }),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/ledger-accounts', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<{ success: boolean; data: unknown }>(`/ledger-accounts/${id}`, data),
  delete: (id: string, companyId: string) =>
    api.delete(`/ledger-accounts/${id}`, { params: { companyId } }),
};

export const ledgerGroupApi = {
  list: (companyId: string) =>
    api.get<{ success: boolean; data: unknown[] }>('/ledger-groups', { params: { companyId } }),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/ledger-groups', data),
};

export const voucherApi = {
  list: (companyId: string, financialYearId: string, params?: { voucherType?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { vouchers: unknown[]; total: number } }>('/vouchers', { params: { companyId, financialYearId, ...params } }),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/vouchers', data),
};

export const userApi = {
  list: (companyId?: string) =>
    api.get<{ success: boolean; data: unknown[] }>('/users', { params: { companyId } }),
  get: (id: string) => api.get<{ success: boolean; data: unknown }>(`/users/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<{ success: boolean; data: unknown }>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
};

export const auditLogApi = {
  list: (params?: { companyId?: string; userId?: string; entityType?: string; action?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { logs: unknown[]; total: number } }>('/audit-logs', { params }),
};
