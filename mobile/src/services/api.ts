import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) return `http://${hostUri.split(':')[0]}:3333`;
    return 'http://10.0.2.2:3333';
  }
  return Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3333';
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const tokenStorage = {
  save:        (token: string) => AsyncStorage.setItem('@emrota:token', token),
  saveRefresh: (token: string) => AsyncStorage.setItem('@emrota:refreshToken', token),
  get:         () => AsyncStorage.getItem('@emrota:token'),
  getRefresh:  () => AsyncStorage.getItem('@emrota:refreshToken'),
  clear:       () => Promise.all([
    AsyncStorage.removeItem('@emrota:token'),
    AsyncStorage.removeItem('@emrota:refreshToken'),
  ]),
};

// fila para evitar múltiplos refreshes simultâneos
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function drainQueue(token?: string, err?: any) {
  pendingQueue.forEach(p => token ? p.resolve(token) : p.reject(err));
  pendingQueue = [];
}

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// auto-refresh em 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error: string }>) => {
    const originalRequest = error.config as any;

    const isAuthRoute = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/register')
      || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefresh();
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken: string = data.token;

        await tokenStorage.save(newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        drainQueue(newToken);
        return api(originalRequest);
      } catch (refreshErr: any) {
        drainQueue(undefined, refreshErr);

        // Só invalidamos a sessão se o SERVIDOR de fato rejeitou o refresh token (ex: 401/403 = expirado ou inválido)
        // Se a chamada de refresh falhou por falta de rede, timeout, ou instabilidade momentânea (sem `response` do servidor), 
        // mantemos o token salvo - o usuário está offline, não desautenticado.
        // Isso evita que reabrir o app sem sinal de internet estável derrube a sessão e force novo login
        const refreshHadServerResponse = !!refreshErr?.response;
        if (refreshHadServerResponse) {
          await tokenStorage.clear();
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const isNetwork = !error.response && (
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('timeout')
    );

    const message = isNetwork
      ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
      : (error.response?.data?.error ?? error.message ?? 'Erro de conexão com o servidor');

    const err = new Error(message) as any;
    err.isNetworkError = isNetwork;
    err.status = error.response?.status;
    err.response = error.response;
    return Promise.reject(err);
  },
);

export const authService = {
  register: (data: { name: string; username: string; email: string; password: string }) =>
    api.post<{ token: string; refreshToken: string; user: import('../types').User }>('/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; refreshToken: string; user: import('../types').User }>('/auth/login', data).then(r => r.data),

  me: () =>
    api.get<{ user: import('../types').User }>('/auth/me').then(r => r.data),

  searchUsers: (q: string) =>
    api.get<{ users: import('../types').UserPreview[] }>(`/auth/search?q=${encodeURIComponent(q)}`).then(r => r.data),
};

export const itineraryService = {
  listMine:    () => api.get<{ itineraries: import('../types').Itinerary[] }>('/itineraries').then(r => r.data),
  listShared:  () => api.get<{ itineraries: import('../types').SharedItinerary[] }>('/itineraries/shared').then(r => r.data),
  get:         (id: string) => api.get<{ itinerary: import('../types').ItineraryDetail }>(`/itineraries/${id}`).then(r => r.data),
  create:      (data: import('../types').CreateItineraryInput) => api.post<{ itinerary: import('../types').ItineraryDetail }>('/itineraries', data).then(r => r.data),
  update:      (id: string, data: import('../types').UpdateItineraryInput) => api.patch<{ itinerary: import('../types').Itinerary }>(`/itineraries/${id}`, data).then(r => r.data),
  delete:      (id: string) => api.delete(`/itineraries/${id}`),
  share:       (id: string, targetUserId: string, permission: 'view' | 'edit') => api.post<{ message: string }>(`/itineraries/${id}/share`, { targetUserId, permission }).then(r => r.data),
  removeShare: (id: string, targetUserId: string) => api.delete(`/itineraries/${id}/share/${targetUserId}`),
};

export const activityService = {
  create: (dayId: string, data: import('../types').CreateActivityInput) => api.post<{ activity: import('../types').Activity }>(`/itineraries/days/${dayId}/activities`, data).then(r => r.data),
  update: (activityId: string, data: Partial<import('../types').CreateActivityInput>) => api.patch<{ activity: import('../types').Activity }>(`/itineraries/activities/${activityId}`, data).then(r => r.data),
  delete: (activityId: string) => api.delete(`/itineraries/activities/${activityId}`),
};