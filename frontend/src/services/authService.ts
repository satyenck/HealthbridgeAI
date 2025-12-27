import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LoginResponse, UserRole} from '../types';

export const authService = {
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(
      API_ENDPOINTS.GOOGLE_LOGIN,
      {id_token: idToken},
    );
    await AsyncStorage.setItem('access_token', response.access_token);
    await AsyncStorage.setItem('user_id', response.user_id);
    await AsyncStorage.setItem('user_role', response.role);
    return response;
  },

  async sendPhoneCode(phoneNumber: string): Promise<{message: string}> {
    return await apiService.post(API_ENDPOINTS.PHONE_SEND_CODE, {
      phone_number: phoneNumber,
    });
  },

  async verifyPhoneCode(
    phoneNumber: string,
    verificationCode: string,
  ): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(
      API_ENDPOINTS.PHONE_VERIFY,
      {
        phone_number: phoneNumber,
        verification_code: verificationCode,
      },
    );
    await AsyncStorage.setItem('access_token', response.access_token);
    await AsyncStorage.setItem('user_id', response.user_id);
    await AsyncStorage.setItem('user_role', response.role);
    return response;
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role']);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  },

  async getUserRole(): Promise<UserRole | null> {
    const role = await AsyncStorage.getItem('user_role');
    return role as UserRole | null;
  },

  async getUserId(): Promise<string | null> {
    return await AsyncStorage.getItem('user_id');
  },
};
