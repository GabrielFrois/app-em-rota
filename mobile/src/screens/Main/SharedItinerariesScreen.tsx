import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { itineraryService } from '../../services/api';
import { prefetchItineraries } from '../../services/prefetchService';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../styles/theme';
import { ItineraryStatus, SharedItinerary, SharedStackParamList } from '../../types';
import { useOnReconnect } from '../../contexts/NetworkContext';

type SharedScreenNav = NativeStackNavigationProp<SharedStackParamList, 'SharedList'>;

const CACHE_KEY_SHARED = '@emrota:shared_itineraries';

const STATUS_TABS: { key: ItineraryStatus; label: string }[] = [
  { key: 'upcoming',  label: 'Futuras'    },
  { key: 'traveling', label: 'Viajando'   },
  { key: 'completed', label: 'Concluídas' },
];

// Calcula o status correto com base na data atual
function resolveStatus(item: SharedItinerary): ItineraryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(item.startDate + 'T00:00:00');
  const end   = new Date(item.endDate   + 'T00:00:00');
  if (today < start) return 'upcoming';
  if (today > end)   return 'completed';
  return 'traveling';
}

// Define qual aba abrir: viajando → futuras → concluídas
function resolveInitialTab(itineraries: SharedItinerary[]): ItineraryStatus {
  if (itineraries.some(i => resolveStatus(i) === 'traveling')) return 'traveling';
  if (itineraries.some(i => resolveStatus(i) === 'upcoming'))  return 'upcoming';
  return 'completed';
}

// Card com acento colorido que ocupa toda a altura do card
const SharedCard: React.FC<{
  item: SharedItinerary;
  accentColor: string;
  onPress: () => void;
  colors: ReturnType<typeof import('../../hooks/useColors').useColors>;
}> = ({ item, accentColor, onPress, colors }) => {
  const [cardHeight, setCardHeight] = useState(0);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
      onPress={onPress}
      onLayout={(e: LayoutChangeEvent) => setCardHeight(e.nativeEvent.layout.height)}
    >
      <View style={[
        styles.cardAccent,
        {
          backgroundColor: accentColor,
          height:    cardHeight > 0 ? cardHeight : undefined,
          minHeight: cardHeight > 0 ? undefined  : 72,
        },
      ]}>
        <MaterialCommunityIcons name={item.emotion as any} size={36} color="white" />
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardRow}>
          <Feather name="user" size={11} color={colors.textSecondary} />
          <Text style={[styles.cardOwner, { color: colors.textSecondary }]}> por {item.ownerName}</Text>
        </View>
        <View style={styles.cardRow}>
          <Feather name="map-pin" size={11} color={colors.textSecondary} />
          <Text style={[styles.cardDestination, { color: colors.textSecondary }]} numberOfLines={1}>
            {' '}{item.destination}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Feather name="calendar" size={11} color={colors.textDisabled} />
          <Text style={[styles.cardDates, { color: colors.textDisabled }]}>
            {' '}{new Date(item.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(item.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SharedItinerariesScreen: React.FC = () => {
  const colors     = useColors();
  const navigation = useNavigation<SharedScreenNav>();

  const [activeTab, setActiveTab]     = useState<ItineraryStatus>('traveling');
  const [itineraries, setItineraries] = useState<SharedItinerary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [isOffline, setIsOffline]     = useState(false);

  const STATUS_COLORS: Record<ItineraryStatus, string> = {
    upcoming:  colors.upcoming,
    traveling: colors.traveling,
    completed: colors.completed,
  };

  useFocusEffect(useCallback(() => { fetchShared(); }, []));

  // Se a internet voltar enquanto o usuário está parado nesta tela,
  // recarrega sozinho em vez de deixar o app preso no "modo offline".
  useOnReconnect(useCallback(() => { fetchShared(); }, []));

  const fetchShared = async () => {
    try {
      setError('');
      const { itineraries: data } = await itineraryService.listShared();
      // Corrige status localmente com base nas datas (sem PATCH — usuário não é dono)
      const corrected = data.map(item => ({ ...item, status: resolveStatus(item) }));
      setItineraries(corrected);
      setActiveTab(resolveInitialTab(corrected));
      setIsOffline(false);
      await AsyncStorage.setItem(CACHE_KEY_SHARED, JSON.stringify(corrected)).catch(() => {});
      prefetchItineraries(corrected).catch(() => {});
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(CACHE_KEY_SHARED).catch(() => null);
      if (cached) {
        const parsed: SharedItinerary[] = JSON.parse(cached);
        const corrected = parsed.map(item => ({ ...item, status: resolveStatus(item) }));
        setItineraries(corrected);
        setActiveTab(resolveInitialTab(corrected));
        setIsOffline(true);
        setError('');
      } else {
        setError(err.message ?? 'Erro ao carregar roteiros');
        setIsOffline(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = itineraries.filter(i => i.status === activeTab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Compartilhados comigo</Text>
      </View>

      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning + '22', borderBottomColor: colors.warning + '44' }]}>
          <Feather name="wifi-off" size={13} color={colors.warning} />
          <Text style={[styles.offlineText, { color: colors.warning }]}>Modo offline — Visualização de dados do último acesso</Text>
        </View>
      )}

      <View style={[styles.tabs, { backgroundColor: colors.divider }]}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && [styles.tabActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === tab.key && { color: colors.primary, fontWeight: fontWeight.semibold },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={colors.textDisabled} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity onPress={fetchShared} style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <SharedCard
              item={item}
              accentColor={item.coverColor ?? STATUS_COLORS[item.status]}
              onPress={() => navigation.navigate('ItineraryDetail', { itineraryId: item.id })}
              colors={colors}
            />
          )}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Feather name="users" size={52} color={colors.textDisabled} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeTab === 'upcoming'
                  ? 'Nenhuma viagem futura compartilhada'
                  : activeTab === 'traveling'
                    ? 'Nenhuma viagem em andamento'
                    : 'Nenhuma viagem concluída'}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchShared(); }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, height: 50, borderBottomWidth: 1 },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  tabs:        { flexDirection: 'row', marginHorizontal: spacing.lg, marginVertical: spacing.md, borderRadius: radius.md, padding: 4 },
  tab:         { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  tabActive:   { ...shadow.sm },
  tabText:     { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  list:        { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  listEmpty:   { flex: 1 },

  card:       { flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.lg, marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm },
  cardAccent: { width: 68, justifyContent: 'center', alignItems: 'center' },
  cardBody:   { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  cardTitle:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: 2 },
  cardRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardOwner:       { fontSize: fontSize.xs },
  cardDestination: { fontSize: fontSize.sm },
  cardDates:       { fontSize: fontSize.xs },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:   { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.md },
  retryBtn:    { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  retryText:   { fontWeight: fontWeight.semibold },
  emptyTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center', paddingHorizontal: spacing.xl },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderBottomWidth: 1 },
  offlineText:   { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});

export default SharedItinerariesScreen;