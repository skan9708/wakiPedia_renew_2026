import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    // Axios v1: headers는 AxiosHeaders 일 수 있으므로 set을 사용
    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` } as any;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const config = err?.config as any;
    const sentAuth = config?.headers?.get?.('Authorization') ?? config?.headers?.Authorization;
    // 만료/무효 토큰이 붙으면 공개 API도 401이 되므로, 토큰을 지우고 비로그인 상태로 한 번 재시도
    if (err?.response?.status === 401 && sentAuth && !config._retriedWithoutAuth) {
      useAuthStore.getState().logout();
      config._retriedWithoutAuth = true;
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Authorization');
      } else {
        delete config.headers.Authorization;
      }
      return api.request(config);
    }
    return Promise.reject(err);
  }
);


