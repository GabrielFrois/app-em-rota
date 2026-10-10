import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type ReconnectCallback = () => void;

interface NetworkContextData {
  // true = temos conexão de fato (rede + internet alcançável)
  isConnected: boolean;
  // permite que uma tela "se inscreva" para ser avisada quando a internet voltar
  onReconnect: (callback: ReconnectCallback) => () => void;
}

const NetworkContext = createContext<NetworkContextData>({
  isConnected: true,
  onReconnect: () => () => {},
});

function resolveIsConnected(state: NetInfoState): boolean {
  // isInternetReachable pode ser `null` momentaneamente (ainda checando);
  // nesse caso confiamos em isConnected para não piscar "offline" à toa.
  if (state.isInternetReachable === false) return false;
  return !!state.isConnected;
}

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const listenersRef = useRef<Set<ReconnectCallback>>(new Set());
  const wasConnectedRef = useRef(true);

  useEffect(() => {
    // Garante o estado inicial correto assim que o app abre
    NetInfo.fetch().then((state) => {
      const connected = resolveIsConnected(state);
      wasConnectedRef.current = connected;
      setIsConnected(connected);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = resolveIsConnected(state);

      // Só dispara os callbacks quando houve uma transição real de offline -> online
      if (connected && !wasConnectedRef.current) {
        listenersRef.current.forEach((cb) => {
          try {
            cb();
          } catch {
            // um listener com erro não deve derrubar os outros
          }
        });
      }

      wasConnectedRef.current = connected;
      setIsConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  const onReconnect = useCallback((callback: ReconnectCallback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, onReconnect }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextData => useContext(NetworkContext);

/**
 * Executa `callback` automaticamente sempre que a internet volta
 * (transição offline -> online), sem precisar que a tela seja
 * refocada ou que o usuário puxe para atualizar.
 *
 * Uso: useOnReconnect(fetchItineraries);
 */
export function useOnReconnect(callback: ReconnectCallback): void {
  const { onReconnect } = useNetwork();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return onReconnect(() => callbackRef.current());
  }, [onReconnect]);
}

export default NetworkContext;