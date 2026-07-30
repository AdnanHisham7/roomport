import { baseApi } from './baseApi';

export interface ReservedTenant {
  _id: string;
  buildingId: string;
  unitId: string;
  bookingId: string;
  ownerId: string;
  name: string;
  email: string;
  phone?: string;
  amount: number;
  isPaid: boolean;
  reservedAt: string;
}

export const reservedTenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReservedTenantByUnit: builder.query<{ data: ReservedTenant | null }, string>({
      query: (unitId) => `/reserved-tenants/unit/${unitId}`,
      providesTags: (_r, _e, unitId) => [{ type: 'Unit', id: `reserved-${unitId}` }],
    }),
  }),
});

export const { useGetReservedTenantByUnitQuery } = reservedTenantApi;
