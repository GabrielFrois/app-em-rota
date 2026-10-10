import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authService, tokenStorage } from '../services/api';
import { registerForPushNotifications, unregisterPushToken } from '../services/notifications';

const USER_CACHE_KEY = '@emrota:user';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Detecta se um erro é de conectividade (sem rede) vs erro de autenticação/servidor
function isNetworkError(err: any): boolean {
  // Flag preservado pelo interceptor do axios
  if (err?.isNetworkError === true) return true;
  // Fallback para outros casos
  const msg: string = (err?.message ?? '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('sem conexão') ||
    msg.includes('connect') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    (err?.status === undefined && err?.response === undefined)
  );
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]     = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) return;

      // Tenta validar o token online
      try {
        const { user: me } = await authService.me();
        setUser(me);
        // Atualiza o cache com os dados mais recentes
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(me));
        registerForPushNotifications().catch(() => {});
      } catch (err: any) {
        if (isNetworkError(err)) {
          // Sem rede: carrega o usuário do cache e mantém a sessão
          const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
          }
          // Não limpa o token — o usuário está offline, não desautenticado
        } else {
          // Erro real (401, 403, token expirado): limpa tudo
          await tokenStorage.clear();
          await AsyncStorage.removeItem(USER_CACHE_KEY);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { token, refreshToken, user: loggedUser } = await authService.login({ email, password });
    await Promise.all([
      tokenStorage.save(token),
      tokenStorage.saveRefresh(refreshToken),
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(loggedUser)),
    ]);
    setUser(loggedUser);
    registerForPushNotifications().catch(() => {});
  };

  const register = async (name: string, username: string, email: string, password: string) => {
    const { token, refreshToken, user: newUser } = await authService.register({ name, username, email, password });
    await Promise.all([
      tokenStorage.save(token),
      tokenStorage.saveRefresh(refreshToken),
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser)),
    ]);
    setUser(newUser);
    registerForPushNotifications().catch(() => {});
  };

  const logout = async () => {
    await unregisterPushToken();
    await tokenStorage.clear();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};

export default AuthContext;