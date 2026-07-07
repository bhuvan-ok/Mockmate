import axios from 'axios';
import { getAccessToken, setAccessToken, notifySessionExpired } from './tokenManager.js';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const axiosInstance = axios.create({ baseURL, withCredentials: true });

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthRoute = config?.url?.includes('/auth/');

    if (response?.status !== 401 || isAuthRoute || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      // Multiple 401s in flight share one refresh call instead of each
      // firing its own — avoids a refresh-token race/rotation conflict.
      refreshPromise =
        refreshPromise ||
        axios
          .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
          .finally(() => {
            refreshPromise = null;
          });

      const { data } = await refreshPromise;
      setAccessToken(data.data.accessToken);
      config.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return axiosInstance(config);
    } catch (refreshError) {
      setAccessToken(null);
      // Refresh token is gone/invalid — the session is over. Without this,
      // Redux's `user` stays populated, so ProtectedRoute never redirects
      // and the candidate is left on the page looking logged-in while every
      // subsequent request 401s silently.
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);
