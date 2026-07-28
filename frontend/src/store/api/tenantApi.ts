import { baseApi } from "./baseApi";
import type { Tenant } from "@/types/tenancy";

export interface CreateTenantInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rentType: string;
  rentAmount: number;
  dueDate: number;
  unitId?: string;
  buildingId?: string;
  job?: string;
  notes?: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
  moveInDate?: string;
  terms?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
}

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<
      { data: Tenant[] },
      { buildingId?: string; unitId?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/tenants/gettenants",
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((t) => ({
                type: "Tenant" as const,
                id: t._id,
              })),
              { type: "Tenant" as const, id: "LIST" },
            ]
          : [{ type: "Tenant" as const, id: "LIST" }],
    }),
    getTenantById: builder.query<{ data: Tenant }, string>({
      query: (id) => `/tenants/gettenant/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Tenant", id }],
    }),
    getTenantLeases: builder.query<{ data: unknown[] }, string>({
      query: (id) => `/tenants/gettenantleases/${id}`,
    }),
    createTenant: builder.mutation<
      { data: Tenant; message?: string },
      CreateTenantInput
    >({
      query: (body) => ({ url: "/tenants/createtenant", method: "POST", body }),
      invalidatesTags: [
        { type: "Tenant", id: "LIST" },
        { type: "Unit", id: "LIST" },
        { type: "Building", id: "LIST" },
      ],
    }),
    updateTenant: builder.mutation<
      { data: Tenant; message?: string },
      {
        id: string;
        body: Partial<
          CreateTenantInput & { status: string; vacateDate: string }
        >;
      }
    >({
      query: ({ id, body }) => ({
        url: `/tenants/updatetenant/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Tenant", id },
        { type: "Tenant", id: "LIST" },
        { type: "Unit", id: "LIST" },
      ],
    }),
    deleteTenant: builder.mutation<{ message?: string }, string>({
      query: (id) => ({ url: `/tenants/deletetenant/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Tenant", id: "LIST" },
        { type: "Unit", id: "LIST" },
      ],
    }),
    transferTenant: builder.mutation<
      { data: Tenant; message: string },
      { tenantId: string; targetUnitId: string }
    >({
      query: ({ tenantId, targetUnitId }) => ({
        url: `/tenants/transfer/${tenantId}`,
        method: "POST",
        body: { targetUnitId },
      }),
      invalidatesTags: [
        { type: "Tenant", id: "LIST" },
        { type: "Unit", id: "LIST" },
        { type: "Building", id: "LIST" },
      ],
    }),
    setTenantPortalAccess: builder.mutation<
      { data: Tenant; message: string },
      { id: string; enabled: boolean }
    >({
      query: ({ id, enabled }) => ({
        url: `/tenants/${id}/portal-access`,
        method: "PATCH",
        body: { enabled },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Tenant", id },
        { type: "Tenant", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTenantsQuery,
  useGetTenantByIdQuery,
  useGetTenantLeasesQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
  useTransferTenantMutation,
  useSetTenantPortalAccessMutation,
} = tenantApi;
