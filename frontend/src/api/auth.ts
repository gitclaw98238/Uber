import { apiClient, unwrapData } from './client';
import { AuthPayload, User } from '../types';

export interface LoginInput {
  email: string;
  password: string;
  role: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  businessName?: string;
}

export const authApi = {
  login: async (payload: LoginInput) => unwrapData<AuthPayload>((await apiClient.post('/auth/login', payload)).data),
  register: async (payload: RegisterInput) => unwrapData<AuthPayload>((await apiClient.post('/auth/register', payload)).data),
  me: async () => unwrapData<User>((await apiClient.get('/auth/me')).data),
  updateProfile: async (payload: Partial<User>) => unwrapData<User>((await apiClient.patch('/auth/profile', payload)).data),
};
