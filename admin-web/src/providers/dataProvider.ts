import { DataProvider } from 'react-admin';
import axios, { AxiosInstance } from 'axios';
import { API_URL } from '../config.js';

const API_BASE_URL = API_URL;

// Create dedicated Axios client with authorization interceptors
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pranova_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // Transparently retry once on transient server/network errors (e.g. the
    // embedded DB still warming up right after boot). Never retry auth/validation.
    const isTransient = !error.response || [500, 502, 503, 504].includes(status);
    if (isTransient && config && !config._retry) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 600));
      return apiClient(config);
    }

    if (status === 401) {
      localStorage.removeItem('pranova_access_token');
      localStorage.removeItem('pranova_refresh_token');
      localStorage.removeItem('pranova_user');
    }
    return Promise.reject(error);
  }
);

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || { field: 'createdAt', order: 'DESC' };
    const filter = params.filter || {};

    const response = await apiClient.get(`/${resource}`, {
      params: {
        page,
        perPage,
        sort: field,
        order,
        ...filter,
      },
    });

    const responseBody = response.data;
    const items = responseBody.data || [];
    const total = responseBody.meta?.total ?? (Array.isArray(items) ? items.length : 0);

    return {
      data: items,
      total,
    };
  },

  getOne: async (resource, params) => {
    const response = await apiClient.get(`/${resource}/${params.id}`);
    return {
      data: response.data.data,
    };
  },

  getMany: async (resource, params) => {
    const response = await apiClient.get(`/${resource}`, {
      params: {
        ids: params.ids.join(','),
      },
    });
    return {
      data: response.data.data || [],
    };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const response = await apiClient.get(`/${resource}`, {
      params: {
        page,
        perPage,
        sort: field,
        order,
        [params.target]: params.id,
        ...params.filter,
      },
    });
    const items = response.data.data || [];
    const total = response.data.meta?.total ?? (Array.isArray(items) ? items.length : 0);
    return {
      data: items,
      total,
    };
  },

  update: async (resource, params) => {
    const response = await apiClient.patch(`/${resource}/${params.id}`, params.data);
    return {
      data: response.data.data,
    };
  },

  updateMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) => apiClient.patch(`/${resource}/${id}`, params.data))
    );
    return { data: params.ids };
  },

  create: async (resource, params) => {
    const response = await apiClient.post(`/${resource}`, params.data);
    return {
      data: response.data.data,
    };
  },

  delete: async (resource, params) => {
    await apiClient.delete(`/${resource}/${params.id}`);
    return {
      data: (params.previousData || { id: params.id }) as any,
    };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) => apiClient.delete(`/${resource}/${id}`))
    );
    return { data: params.ids };
  },
};
