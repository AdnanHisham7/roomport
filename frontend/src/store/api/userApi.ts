import { baseApi } from './baseApi';
import type { FullProfile } from '@/types/auth';

export interface ManagerItem {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  status: string;
  createdAt?: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<{ data: FullProfile }, void>({
      query: () => '/users/profile',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<{ data: FullProfile; message?: string }, Partial<{ first_name: string; last_name: string; phone_number: string; profile_image: string; payoutQrCodeUrl: string }>>({
      query: (body) => ({ url: '/users/profile', method: 'PUT', body }),
      invalidatesTags: ['Profile'],
    }),
    createManager: builder.mutation<{ data: ManagerItem; message?: string }, { email: string; password: string; first_name: string; last_name: string; phone_number?: string }>({
      query: (body) => ({ url: '/users/manager', method: 'POST', body }),
      invalidatesTags: ['Managers'],
    }),
    getMyManagers: builder.query<{ data: ManagerItem[] }, void>({
      query: () => '/users/manager',
      providesTags: ['Managers'],
    }),
    updateManagerStatus: builder.mutation<{ data: ManagerItem; message?: string }, { id: string; status: string }>({
      query: ({ id, ...body }) => ({ url: `/users/manager/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: ['Managers'],
    }),
    deleteManager: builder.mutation<{ message?: string }, string>({
      query: (id) => ({ url: `/users/manager/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Managers'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useCreateManagerMutation,
  useGetMyManagersQuery,
  useUpdateManagerStatusMutation,
  useDeleteManagerMutation,
} = userApi;
