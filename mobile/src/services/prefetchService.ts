import AsyncStorage from '@react-native-async-storage/async-storage';
import { itineraryService } from './api';
import { Itinerary, SharedItinerary } from '../types';

const CACHE_KEY = (id: string) => `@emrota:itinerary:${id}`;

/**
 * Baixa os detalhes de todos os roteiros em segundo plano e salva no cache.
 * Chamado após carregar a lista com sucesso — não bloqueia a UI.
 */
export async function prefetchItineraries(
  itineraries: (Itinerary | SharedItinerary)[]
): Promise<void> {
  for (const item of itineraries) {
    try {
      // Só atualiza se o roteiro foi modificado desde o último cache
      const existing = await AsyncStorage.getItem(CACHE_KEY(item.id)).catch(() => null);
      if (existing) {
        const cached = JSON.parse(existing);
        if (cached.updatedAt === item.updatedAt) continue;
      }

      const { itinerary } = await itineraryService.get(item.id);
      await AsyncStorage.setItem(CACHE_KEY(item.id), JSON.stringify(itinerary)).catch(() => {});
    } catch (err: any) {
      // Se for erro de rede, para o prefetch para não tentar todos inutilmente
      if (err?.isNetworkError) break;
      // Outros erros (ex: 404 em um roteiro específico) — continua para o próximo
    }
  }
}