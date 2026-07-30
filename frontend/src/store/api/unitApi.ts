import { baseApi } from './baseApi';
import type { Unit } from '@/types/building';

export interface CreateUnitInput {
  unitNumber: string;
  floorNumber: string;
  buildingId: string;
  title?: string;
  description?: string;
  images?: string[];
  rentAmount: number;
  amenities?: string[];
  bedrooms: number;
  bathrooms: number;
  status?: string;
  tokenAmount?: number;
}

export const unitApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnits: builder.query<{ data: Unit[] }, { buildingId?: string; status?: string; isOccupied?: boolean } | void>({
      query: (params) => ({ url: '/units', params: params ?? undefined }),
      providesTags: (result, _e, arg) => [
        ...(result?.data.map((u) => ({ type: 'Unit' as const, id: u._id })) ?? []),
        { type: 'Unit' as const, id: arg && 'buildingId' in (arg as any) ? `LIST-${(arg as any).buildingId}` : 'LIST' },
        { type: 'Unit' as const, id: 'LIST' },
      ],
    }),
    getUnitById: builder.query<{ data: Unit }, string>({
      query: (id) => `/units/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Unit', id }],
    }),
    createUnit: builder.mutation<{ data: Unit; success?: boolean }, CreateUnitInput>({
      query: (body) => ({ url: '/units', method: 'POST', body }),
      invalidatesTags: (r) => [{ type: 'Unit', id: 'LIST' }, { type: 'Unit', id: `LIST-${r?.data.buildingId}` }, { type: 'Building', id: r?.data.buildingId }, { type: 'Floor', id: `LIST-${r?.data.buildingId}` }],
    }),
    updateUnit: builder.mutation<{ data: Unit; success?: boolean }, { id: string; body: Partial<CreateUnitInput & { isOccupied: boolean }> }>({
      query: ({ id, body }) => ({ url: `/units/${id}`, method: 'PATCH', body }),
      invalidatesTags: (r, _e, { id }) => [{ type: 'Unit', id }, { type: 'Unit', id: 'LIST' }, { type: 'Building', id: r?.data.buildingId }],
    }),
    deleteUnit: builder.mutation<{ success?: boolean; message?: string }, { id: string; buildingId: string }>({
      query: ({ id }) => ({ url: `/units/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id, buildingId }) => [{ type: 'Unit', id }, { type: 'Unit', id: 'LIST' }, { type: 'Building', id: buildingId }, { type: 'Floor', id: `LIST-${buildingId}` }],
    }),
    bulkUpdateUnits: builder.mutation<{ data: Unit[] }, { unitIds: string[]; updateData: Partial<CreateUnitInput> }>({
      query: (body) => ({ url: '/units/bulk-update', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUnitsQuery,
  useGetUnitByIdQuery,
  useLazyGetUnitByIdQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useBulkUpdateUnitsMutation,
} = unitApi;
