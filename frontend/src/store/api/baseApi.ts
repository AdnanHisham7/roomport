import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import type { RootState } from '../store';
import { setTokens, logout } from '../slices/authSlice';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const publicPaths = ['/auth/login', '/auth/register', '/auth/refresh-token', '/system/bootstrap'];

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === 'string' ? args : args.url;
  const isAuthEndpoint = publicPaths.some((p) => url.includes(p));

  if (result.error && result.error.status === 401 && !isAuthEndpoint) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (refreshToken) {
          const refreshResult = await rawBaseQuery({ url: '/auth/refresh-token', method: 'POST', body: { refreshToken } }, api, extraOptions);
          if (refreshResult.data) {
            const payload = refreshResult.data as { data: { accessToken: string; refreshToken: string } };
            api.dispatch(setTokens(payload.data));
            result = await rawBaseQuery(args, api, extraOptions);
          } else {
            api.dispatch(logout());
          }
        } else {
          api.dispatch(logout());
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Profile', 'Building', 'Floor', 'Unit', 'Tenant', 'Agreement', 'Document',
    'Expense', 'Notification', 'Managers', 'ActivityLog', 'Subscription', 'Inquiry',
    'SuperAdminStats', 'SuperAdminBuilders', 'SuperAdminBuildings', 'SuperAdminSettings',
    'Public', 'Analytics', 'PaymentRecord', 'UpgradeRequests', 'Booking', 'Offer', 'Payout',
  ],
  endpoints: () => ({}),
});
