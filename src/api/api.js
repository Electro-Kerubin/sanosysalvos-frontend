import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_PROFILE_ROUTES = ['/api/auth/me', '/api/auth/profile', '/api/auth/usuario'];

async function getFromFirstAvailableRoute(routes) {
  let lastError = null;

  for (const route of routes) {
    try {
      return await api.get(route);
    } catch (error) {
      const status = error?.response?.status;
      // Skip only missing route errors and continue trying known alternatives.
      if (status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('No profile route available under /api/auth/**');
}

api.interceptors.request.use(async config => {
  let token = await AsyncStorage.getItem('token');
  // Fallback a localStorage en entorno web cuando AsyncStorage devuelve null
  if (!token && typeof window !== 'undefined' && window.localStorage) {
    token = window.localStorage.getItem('token');
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('api: no se encontró token para', config.url);
  }
  return config;
});

export default {
  login: (email, password) => api.post('/api/auth/login', { email, contrasena: password }),
  register: (data) => api.post('/api/auth/register', data),
  getProfile: async () => getFromFirstAvailableRoute(AUTH_PROFILE_ROUTES),
  // Reportes
  getReports: () => api.get('/api/reportes'),
  getReport: id => api.get(`/api/reportes/${id}`),
  createReport: data => api.post('/api/reportes', data),
  updateReport: (id, data) => api.put(`/api/reportes/${id}`, data),
  // Mascotas
  createMascota: data => api.post('/api/mascotas', data),
  updateMascota: (id, data) => api.put(`/api/mascotas/${id}`, data),
  // Contactos
  createContacto: data => api.post('/api/contactos', data),
  // Catálogos
  getTiposReporte: () => api.get('/api/catalogos/tipos-reporte'),
  getEstatus: () => api.get('/api/catalogos/estatus'),
  getEspecies: () => api.get('/api/catalogos/especies'),
  getRazas: () => api.get('/api/catalogos/razas'),
  getSexos: () => api.get('/api/catalogos/sexos'),
  getMarcasDistintivas: () => api.get('/api/catalogos/marcas-distintivas'),
  getCanalesPreferencia: () => api.get('/api/catalogos/canales-preferencia'),
  // Otros
  getGeo: params => api.get('/api/geo', { params }),
  getMatches: reportId => api.get('/api/matching', { params: { reportId } }),
  getNotifications: () => api.get('/api/notificaciones'),
  uploadMedia: data => api.post('/api/storage', data),
  health: () => api.get('/actuator/health'),
  info: () => api.get('/actuator/info'),
  gatewayInfo: () => api.get('/actuator/gateway')
};