import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { api } from './api';

const PUSH_TOKEN_KEY = '@emrota:push_token';

// Como exibir notificações quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permissão negada');
      return null;
    }

    // Canal obrigatório para Android 8+
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Em Rota',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2D6BE4',
      });
    }

    // projectId obrigatório em builds standalone
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('[Notifications] projectId não encontrado — push desativado');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Só envia para o backend se o token mudou
    const saved = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (saved !== token) {
      await api.post('/auth/push-token', { token });
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }

    return token;
  } catch (err) {
    console.log('[Notifications] Erro ao registrar:', err);
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await api.delete('/auth/push-token', { data: { token } }).catch(() => {});
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.log('[Notifications] Erro ao remover token:', err);
  }
}