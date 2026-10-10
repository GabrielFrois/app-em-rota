import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOnReconnect } from '../../contexts/NetworkContext';
import { activityService, itineraryService, authService } from '../../services/api';
import { useColors } from '../../hooks/useColors';
import { lightColors, fontSize, fontWeight, radius, shadow, spacing } from '../../styles/theme';
import {
  Activity, ItineraryDetail, ItineraryStackParamList,
  UserPreview, EMOTION_OPTIONS, ItineraryEmotion,
} from '../../types';

type Colors = typeof lightColors;

const COVER_COLORS = [
  '#2D6BE4', '#E84A4A', '#27AE60', '#F2994A',
  '#9B51E0', '#2D9CDB', '#EB5757', '#219653',
  '#F2C94C', '#BB6BD9', '#56CCF2', '#6FCF97',
];
const CATEGORIES = [...new Set(EMOTION_OPTIONS.map(e => e.category))];

type Props = NativeStackScreenProps<ItineraryStackParamList, 'ItineraryDetail'>;
const CACHE_KEY = (id: string) => `@emrota:itinerary:${id}`;


type Period = { key: string; label: string; icon: string; range: [number, number] };
const PERIODS: Period[] = [
  { key: 'manha',     label: 'Manhã',     icon: 'weather-sunny',         range: [6, 11]  },
  { key: 'tarde',     label: 'Tarde',     icon: 'weather-partly-cloudy', range: [12, 17] },
  { key: 'noite',     label: 'Noite',     icon: 'weather-night',         range: [18, 23] },
  { key: 'madrugada', label: 'Madrugada', icon: 'moon-waning-crescent',  range: [0, 5]   },
];
const getPeriod = (startTime?: string): string => {
  if (!startTime) return 'manha';
  const hour = parseInt(startTime.split(':')[0], 10);
  return PERIODS.find(p => hour >= p.range[0] && hour <= p.range[1])?.key ?? 'manha';
};
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ShareMember {
  userId: string; name: string; username: string; email: string; permission: 'view' | 'edit';
}

// ─── Modal de confirmação genérico ───────────────────────────────────────────
interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  colors: Colors;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, confirmLabel = 'Confirmar',
  confirmDanger = false, onConfirm, onCancel, colors,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <TouchableOpacity style={cmS(colors).overlay} activeOpacity={1} onPress={onCancel}>
      <View style={cmS(colors).sheet}>
        <Text style={cmS(colors).title}>{title}</Text>
        <Text style={cmS(colors).message}>{message}</Text>
        <View style={cmS(colors).btns}>
          <TouchableOpacity style={cmS(colors).cancelBtn} onPress={onCancel}>
            <Text style={cmS(colors).cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cmS(colors).confirmBtn, confirmDanger && { backgroundColor: colors.danger }]}
            onPress={onConfirm}
          >
            <Text style={cmS(colors).confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);
const cmS = (colors: Colors) => StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  sheet:      { width: '100%', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  title:      { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  message:    { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
  btns:       { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  confirmText:{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: 'white' },
});

// ─── Componente principal ─────────────────────────────────────────────────────
const ItineraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { itineraryId } = route.params;
  const { user: me } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [itinerary, setItinerary]       = useState<ItineraryDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [isOffline, setIsOffline]        = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // ── Modal: adicionar atividade ────────────────────────────────────────────
  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [addLoading, setAddLoading]       = useState(false);
  const [actTitle, setActTitle]           = useState('');
  const [actLocation, setActLocation]     = useState('');
  const [actTime, setActTime]             = useState('');
  const [actNotes, setActNotes]           = useState('');
  const [actTitleError, setActTitleError] = useState('');

  // ── Modal: editar atividade ───────────────────────────────────────────────
  const [showEditModal, setShowEditModal]       = useState(false);
  const [editingActivity, setEditingActivity]   = useState<Activity | null>(null);
  const [editLoading, setEditLoading]           = useState(false);
  const [editTitle, setEditTitle]               = useState('');
  const [editLocation, setEditLocation]         = useState('');
  const [editTime, setEditTime]                 = useState('');
  const [editNotes, setEditNotes]               = useState('');
  const [editTitleError, setEditTitleError]     = useState('');

  // ── Confirm modals ────────────────────────────────────────────────────────
  const [confirmDeleteActivity, setConfirmDeleteActivity] = useState<string | null>(null);
  const [confirmDeleteItinerary, setConfirmDeleteItinerary] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember]     = useState<ShareMember | null>(null);
  const [confirmLostDays, setConfirmLostDays]             = useState(false);

  // ── Modal: erro genérico ──────────────────────────────────────────────────
  const [errorModal, setErrorModal]   = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const showError = (msg: string) => { setErrorMessage(msg); setErrorModal(true); };

  // ── Modal: sucesso compartilhamento ──────────────────────────────────────
  const [successModal, setSuccessModal]     = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const showSuccess = (msg: string) => { setSuccessMessage(msg); setSuccessModal(true); };

  // ── Modal: compartilhar ───────────────────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMembers, setShareMembers]     = useState<ShareMember[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<UserPreview[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [selectedUser, setSelectedUser]     = useState<UserPreview | null>(null);
  const [selectedPerm, setSelectedPerm]     = useState<'view' | 'edit'>('view');
  const [shareLoading, setShareLoading]     = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal: editar roteiro ─────────────────────────────────────────────────
  const [showEditItinerary, setShowEditItinerary]       = useState(false);
  const [editItinLoading, setEditItinLoading]           = useState(false);
  const [editItinTitle, setEditItinTitle]               = useState('');
  const [editItinDest, setEditItinDest]                 = useState('');
  const [editItinStart, setEditItinStart]               = useState('');
  const [editItinStartDisplay, setEditItinStartDisplay] = useState('');
  const [editItinEnd, setEditItinEnd]                   = useState('');
  const [editItinEndDisplay, setEditItinEndDisplay]     = useState('');
  const [editItinEmotion, setEditItinEmotion]           = useState<ItineraryEmotion>('map-outline');
  const [editItinColor, setEditItinColor]               = useState(COVER_COLORS[0]);
  const [editItinTitleErr, setEditItinTitleErr]         = useState('');
  const [editItinDestErr, setEditItinDestErr]           = useState('');
  const [editItinStartErr, setEditItinStartErr]         = useState('');
  const [editItinEndErr, setEditItinEndErr]             = useState('');
  const [showEditIconModal, setShowEditIconModal]       = useState(false);
  const [editIconCategory, setEditIconCategory]         = useState(CATEGORIES[0]);
  const [showContextMenu, setShowContextMenu]           = useState(false);
  const [showLostDaysModal, setShowLostDaysModal]       = useState(false);
  const [lostDaysInfo, setLostDaysInfo]                 = useState<{ dayNumber: number; dateStr: string; actCount: number }[]>([]);
  const [lostActivitiesTotal, setLostActivitiesTotal]   = useState(0);

  useEffect(() => { fetchDetail(true); }, []);

  // Se a internet voltar enquanto o usuário está vendo este roteiro,
  // recarrega sozinho em vez de deixar o app preso no "modo offline".
  useOnReconnect(useCallback(() => { fetchDetail(); }, []));

  const fetchDetail = async (isFirstLoad = false) => {
    try {
      setError('');
      const { itinerary: data } = await itineraryService.get(itineraryId);
      setItinerary(data);
      setIsOffline(false);
      if (isFirstLoad && data.days.length > 0) setExpandedDays(new Set([data.days[0].id]));
      if ((data as any).members) setShareMembers((data as any).members);
      await AsyncStorage.setItem(CACHE_KEY(itineraryId), JSON.stringify(data)).catch(() => {});
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(CACHE_KEY(itineraryId)).catch(() => null);
      if (cached) {
        const data = JSON.parse(cached);
        setItinerary(data);
        setIsOffline(true);
        setError('');
        if (isFirstLoad && data.days.length > 0) setExpandedDays(new Set([data.days[0].id]));
        if ((data as any).members) setShareMembers((data as any).members);
      } else {
        setError(err.message ?? 'Erro ao carregar roteiro');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });
  };

  // ── Adicionar atividade ───────────────────────────────────────────────────
  const openAddActivity = (dayId: string) => {
    setSelectedDayId(dayId);
    setActTitle(''); setActLocation(''); setActTime(''); setActNotes('');
    setActTitleError('');
    setShowAddModal(true);
  };

  const handleAddActivity = async () => {
    if (!actTitle.trim()) { setActTitleError('Nome da atividade é obrigatório'); return; }
    setAddLoading(true);
    try {
      await activityService.create(selectedDayId, {
        title: actTitle.trim(),
        locationName: actLocation.trim() || undefined,
        startTime: actTime || undefined,
        notes: actNotes.trim() || undefined,
      });
      setShowAddModal(false);
      setExpandedDays(prev => new Set([...prev, selectedDayId]));
      await fetchDetail();
    } catch (err: any) {
      showError(err.message ?? 'Erro ao adicionar atividade');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Editar atividade ──────────────────────────────────────────────────────
  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setEditTitle(activity.title);
    setEditLocation(activity.locationName ?? '');
    setEditTime(activity.startTime ?? '');
    setEditNotes(activity.notes ?? '');
    setEditTitleError('');
    setShowEditModal(true);
  };

  const handleEditActivity = async () => {
    if (!editTitle.trim()) { setEditTitleError('Nome é obrigatório'); return; }
    if (!editingActivity) return;
    if (isOffline) {
      showError('Você está offline. Conecte-se à internet para editar atividades.');
      return;
    }
    setEditLoading(true);
    try {
      await activityService.update(editingActivity.id, {
        title: editTitle.trim(),
        locationName: editLocation.trim() || undefined,
        startTime: editTime || undefined,
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
      await fetchDetail();
    } catch (err: any) {
      const msg: string = err.message ?? '';
      showError(
        msg.toLowerCase().includes('network') || msg.includes('Sem conexão')
          ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
          : msg || 'Erro ao editar atividade',
      );
    } finally {
      setEditLoading(false);
    }
  };

  const doDeleteActivity = async (activityId: string) => {
    if (isOffline) {
      showError('Você está offline. Conecte-se à internet para excluir atividades.');
      return;
    }
    try {
      await activityService.delete(activityId);
      await fetchDetail();
    } catch (err: any) {
      const msg: string = err.message ?? '';
      showError(
        msg.toLowerCase().includes('network') || msg.includes('Sem conexão')
          ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
          : msg || 'Erro ao excluir atividade',
      );
    }
  };

  // ── Compartilhar ──────────────────────────────────────────────────────────
  const openShareModal = () => {
    setSearchQuery(''); setSearchResults([]); setSelectedUser(null); setSelectedPerm('view');
    setShowShareModal(true);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text); setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { users } = await authService.searchUsers(text.trim());
        const alreadyIn = new Set(shareMembers.map(m => m.userId));
        setSearchResults(users.filter(u => u.id !== me?.id && !alreadyIn.has(u.id)));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const handleShare = async () => {
    if (!selectedUser) return;
    setShareLoading(true);
    try {
      await itineraryService.share(itineraryId, selectedUser.id, selectedPerm);
      setShareMembers(prev => [...prev, {
        userId: selectedUser.id, name: selectedUser.name,
        username: selectedUser.username, email: selectedUser.email, permission: selectedPerm,
      }]);
      setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
      showSuccess(`${selectedUser.name} agora tem acesso ao roteiro.`);
    } catch (err: any) {
      showError(err.message ?? 'Não foi possível compartilhar');
    } finally {
      setShareLoading(false);
    }
  };

  const doRemoveShare = async (member: ShareMember) => {
    try {
      await itineraryService.removeShare(itineraryId, member.userId);
      setShareMembers(prev => prev.filter(m => m.userId !== member.userId));
    } catch (err: any) {
      showError(err.message);
    }
  };

  // ── Editar / salvar roteiro ───────────────────────────────────────────────
  const formatDateInput = (text: string): { display: string; iso: string } => {
    const nums = text.replace(/\D/g, '').slice(0, 8);
    let display = nums;
    if (nums.length > 2) display = nums.slice(0, 2) + '/' + nums.slice(2);
    if (nums.length > 4) display = nums.slice(0, 2) + '/' + nums.slice(2, 4) + '/' + nums.slice(4);
    const iso = nums.length === 8 ? `${nums.slice(4)}-${nums.slice(2, 4)}-${nums.slice(0, 2)}` : '';
    return { display, iso };
  };

  const openEditItinerary = () => {
    if (!itinerary) return;
    setEditItinTitle(itinerary.title); setEditItinDest(itinerary.destination);
    const sn = itinerary.startDate.replace(/-/g, '');
    const en = itinerary.endDate.replace(/-/g, '');
    setEditItinStart(itinerary.startDate);
    setEditItinStartDisplay(`${sn.slice(6)}/${sn.slice(4, 6)}/${sn.slice(0, 4)}`);
    setEditItinEnd(itinerary.endDate);
    setEditItinEndDisplay(`${en.slice(6)}/${en.slice(4, 6)}/${en.slice(0, 4)}`);
    setEditItinEmotion((itinerary.emotion as ItineraryEmotion) ?? 'map-outline');
    setEditItinColor(itinerary.coverColor ?? COVER_COLORS[0]);
    setEditItinTitleErr(''); setEditItinDestErr('');
    setEditItinStartErr(''); setEditItinEndErr('');
    setShowEditItinerary(true); setShowContextMenu(false);
  };

  const doSaveItinerary = async () => {
    if (isOffline) {
      showError('Você está offline. Conecte-se à internet para salvar alterações.');
      return;
    }
    setEditItinLoading(true);
    try {
      await itineraryService.update(itineraryId, {
        title: editItinTitle.trim(), destination: editItinDest.trim(),
        startDate: editItinStart, endDate: editItinEnd,
        emotion: editItinEmotion, coverColor: editItinColor,
      });
      setShowEditItinerary(false);
      await fetchDetail();
    } catch (err: any) {
      const msg: string = err.message ?? '';
      showError(
        msg.toLowerCase().includes('network') || msg.includes('Sem conexão')
          ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
          : msg || 'Não foi possível salvar',
      );
    } finally {
      setEditItinLoading(false);
    }
  };

  const handleEditItinerary = async () => {
    let valid = true;
    if (!editItinTitle.trim()) { setEditItinTitleErr('Título é obrigatório'); valid = false; }
    if (!editItinDest.trim())  { setEditItinDestErr('Destino é obrigatório'); valid = false; }
    if (!editItinStart)        { setEditItinStartErr('Informe a data de início'); valid = false; }
    if (!editItinEnd)          { setEditItinEndErr('Informe a data de fim'); valid = false; }
    if (editItinStart && editItinEnd && editItinEnd < editItinStart) {
      setEditItinEndErr('Data de fim deve ser após o início'); valid = false;
    }
    if (!valid) return;

    if (itinerary && (editItinStart !== itinerary.startDate || editItinEnd !== itinerary.endDate)) {
      const removedDays = itinerary.days.filter(d => d.date < editItinStart || d.date > editItinEnd);
      const lostActivities = removedDays.reduce((sum, d) => sum + d.activities.length, 0);
      if (removedDays.length > 0) {
        const days = removedDays.map(d => {
          const date = new Date(d.date + 'T12:00:00');
          return {
            dayNumber: d.dayNumber,
            dateStr: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            actCount: d.activities.length,
          };
        });
        setLostDaysInfo(days);
        setLostActivitiesTotal(lostActivities);
        if (removedDays.length <= 5) {
          setConfirmLostDays(true);
        } else {
          setShowLostDaysModal(true);
        }
        return;
      }
    }
    await doSaveItinerary();
  };

  const doDeleteItinerary = async () => {
    if (isOffline) {
      showError('Você está offline. Conecte-se à internet para excluir o roteiro.');
      return;
    }
    try {
      await itineraryService.delete(itineraryId);
      navigation.goBack();
    } catch (err: any) {
      const msg: string = err.message ?? '';
      showError(
        msg.toLowerCase().includes('network') || msg.includes('Sem conexão')
          ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
          : msg || 'Não foi possível excluir o roteiro',
      );
    }
  };

  // ── Atividades agrupadas por período ──────────────────────────────────────
  const getActivitiesByPeriod = (activities: Activity[]) =>
    PERIODS.map(period => ({
      period,
      activities: activities
        .filter(a => getPeriod(a.startTime) === period.key)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    })).filter(p => p.activities.length > 0);

  // ── Loading / erro ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (error || !itinerary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.lg }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <Feather name="alert-circle" size={40} color={colors.danger} />
          <Text style={{ color: colors.danger, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchDetail()} style={{ marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.primaryLight, borderRadius: radius.md }}>
            <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = itinerary.permission === 'owner' || itinerary.permission === 'edit';
  const isOwner = itinerary.permission === 'owner';
  const s = makeStyles(colors, insets.bottom);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{itinerary.title}</Text>
        {isOwner ? (
          <TouchableOpacity onPress={openShareModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="user-plus" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 22 }} />}
      </View>

      {/* ── Banner offline ── */}
      {isOffline && (
        <View style={s.offlineBanner}>
          <Feather name="wifi-off" size={14} color="#fff" />
          <Text style={s.offlineBannerText}>Modo offline — Visualização de dados do último acesso</Text>
        </View>
      )}

      {/* ── Lista de dias ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.daysList}>

        {/* Banner */}
        <View style={[s.banner, { backgroundColor: itinerary.coverColor ?? colors.primary }]}>
  <MaterialCommunityIcons name={itinerary.emotion as any} size={48} color="white" />
  <View style={{ flex: 1 }}>
    <Text style={s.bannerTitle}>{itinerary.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
        <Text style={s.bannerDest}>{itinerary.destination}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <Feather name="calendar" size={12} color="rgba(255,255,255,0.8)" />
        <Text style={s.bannerDates}>
          {new Date(itinerary.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(itinerary.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
        </Text>
      </View>
      {itinerary.permission !== 'owner' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Feather name={itinerary.permission === 'edit' ? 'edit-2' : 'eye'} size={11} color="rgba(255,255,255,0.6)" />
          <Text style={s.permPillText}>{itinerary.permission === 'edit' ? 'Você pode editar' : 'Somente visualização'}</Text>
        </View>
      )}
    </View>
    {canEdit && (
      <TouchableOpacity onPress={() => setShowContextMenu(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.bannerMenuBtn}>
        <Feather name="more-vertical" size={18} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>
    )}
  </View>
        <View style={s.bannerGap} />

        {itinerary.days.length === 0 ? (
          <View style={s.center}>
            <Feather name="calendar" size={40} color={colors.textDisabled} />
            <Text style={s.emptyText}>Nenhum dia no roteiro</Text>
          </View>
        ) : itinerary.days.map(day => {
          const date = new Date(day.date + 'T12:00:00');
          const isExpanded = expandedDays.has(day.id);
          const byPeriod = getActivitiesByPeriod(day.activities);
          return (
            <View key={day.id} style={s.dayCard}>
              <TouchableOpacity style={s.dayHeader} onPress={() => toggleDay(day.id)} activeOpacity={0.7}>
                <View style={[s.dayBadge, { backgroundColor: itinerary.coverColor ?? colors.primary }]}>
                  <Text style={s.dayBadgeNum}>{day.dayNumber}</Text>
                  <Text style={s.dayBadgeLabel}>DIA</Text>
                </View>
                <View style={s.dayInfo}>
                  <Text style={s.dayTitle}>
                    {WEEKDAYS[date.getDay()]}, {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </Text>
                  <Text style={s.daySubtitle}>
                    {day.activities.length === 0 ? 'Nenhuma atividade' : `${day.activities.length} atividade${day.activities.length > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDisabled} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.dayContent}>
                  {byPeriod.map(({ period, activities }) => (
                    <View key={period.key} style={s.periodSection}>
                      <View style={s.periodHeader}>
                        <MaterialCommunityIcons name={period.icon as any} size={14} color={colors.textSecondary} />
                        <Text style={s.periodLabel}>{period.label}</Text>
                      </View>
                      {activities.map(activity => (
                        <View key={activity.id} style={s.activityItem}>
                          <View style={s.activityDot} />
                          <View style={s.activityBody}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Text style={s.activityTitle}>{activity.title}</Text>
                              {canEdit && (
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                  <TouchableOpacity onPress={() => openEditActivity(activity)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Feather name="edit-2" size={14} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => setConfirmDeleteActivity(activity.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Feather name="trash-2" size={14} color={colors.textDisabled} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                            {activity.startTime && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Feather name="clock" size={11} color={colors.textDisabled} />
                                <Text style={s.activityMeta}>{activity.startTime}{activity.endTime ? ` — ${activity.endTime}` : ''}</Text>
                              </View>
                            )}
                            {activity.locationName && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Feather name="map-pin" size={11} color={colors.textDisabled} />
                                <Text style={s.activityMeta}>{activity.locationName}</Text>
                              </View>
                            )}
                            {activity.notes ? <Text style={s.activityNotes}>{activity.notes}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}

                  {canEdit && (
                    <TouchableOpacity style={s.addActivityBtn} onPress={() => openAddActivity(day.id)}>
                      <Feather name="plus" size={16} color={colors.primary} />
                      <Text style={s.addActivityText}>Adicionar atividade</Text>
                    </TouchableOpacity>
                  )}
                  {day.activities.length === 0 && (
                    <Text style={s.emptyDay}>Nenhuma atividade neste dia</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          MODAL: EDITAR ATIVIDADE
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Editar Atividade</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={s.field}>
                <Text style={s.label}>Nome da atividade *</Text>
                <TextInput style={[s.input, !!editTitleError && s.inputError]} placeholder="Ex: Visita ao museu" placeholderTextColor={colors.textDisabled} value={editTitle} onChangeText={t => { setEditTitle(t); setEditTitleError(''); }} />
                {editTitleError ? <Text style={s.errorText}>{editTitleError}</Text> : null}
              </View>
              <View style={s.field}>
                <Text style={s.label}>Local</Text>
                <View style={s.inputRow}>
                  <Feather name="map-pin" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                  <TextInput style={s.inputFlex} placeholder="Ex: Museu do Ipiranga" placeholderTextColor={colors.textDisabled} value={editLocation} onChangeText={setEditLocation} />
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Horário</Text>
                <View style={s.inputRow}>
                  <Feather name="clock" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                  <TextInput style={s.inputFlex} placeholder="Ex: 09:00" placeholderTextColor={colors.textDisabled} value={editTime} onChangeText={text => { const d = text.replace(/\D/g, '').slice(0, 4); setEditTime(d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d); }} keyboardType="number-pad" maxLength={5} />
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Notas</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="Observações, endereço, dicas..." placeholderTextColor={colors.textDisabled} value={editNotes} onChangeText={setEditNotes} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleEditActivity} disabled={editLoading}>
                  {editLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={s.saveText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: ADICIONAR ATIVIDADE
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Nova Atividade</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={s.field}>
                <Text style={s.label}>Nome da atividade *</Text>
                <TextInput style={[s.input, !!actTitleError && s.inputError]} placeholder="Ex: Visita ao museu" placeholderTextColor={colors.textDisabled} value={actTitle} onChangeText={t => { setActTitle(t); setActTitleError(''); }} />
                {actTitleError ? <Text style={s.errorText}>{actTitleError}</Text> : null}
              </View>
              <View style={s.field}>
                <Text style={s.label}>Local</Text>
                <View style={s.inputRow}>
                  <Feather name="map-pin" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                  <TextInput style={s.inputFlex} placeholder="Ex: Museu do Ipiranga" placeholderTextColor={colors.textDisabled} value={actLocation} onChangeText={setActLocation} />
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Horário</Text>
                <View style={s.inputRow}>
                  <Feather name="clock" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                  <TextInput style={s.inputFlex} placeholder="Ex: 09:00" placeholderTextColor={colors.textDisabled} value={actTime} onChangeText={text => { const d = text.replace(/\D/g, '').slice(0, 4); setActTime(d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d); }} keyboardType="number-pad" maxLength={5} />
                </View>
                <Text style={s.hint}>Define o período automaticamente (manhã, tarde, noite)</Text>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Notas</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="Observações, endereço, dicas..." placeholderTextColor={colors.textDisabled} value={actNotes} onChangeText={setActNotes} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleAddActivity} disabled={addLoading}>
                  {addLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={s.saveText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: COMPARTILHAR ROTEIRO
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowShareModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Compartilhar roteiro</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.shareSection}>Adicionar pessoa</Text>
              <View style={s.searchBox}>
                <Feather name="search" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                <TextInput style={s.searchInput} placeholder="Buscar por e-mail ou @username" placeholderTextColor={colors.textDisabled} value={searchQuery} onChangeText={handleSearchChange} autoCapitalize="none" autoCorrect={false} />
                {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
                {searchQuery.length > 0 && !searchLoading && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setSelectedUser(null); }}>
                    <Feather name="x-circle" size={16} color={colors.textDisabled} />
                  </TouchableOpacity>
                )}
              </View>
              {searchResults.length > 0 && !selectedUser && (
                <View style={s.searchResultsBox}>
                  {searchResults.map(u => (
                    <TouchableOpacity key={u.id} style={s.searchResultItem} onPress={() => { setSelectedUser(u); setSearchResults([]); }}>
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>{u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userName}>{u.name}</Text>
                        <Text style={s.userSub}>@{u.username} · {u.email}</Text>
                      </View>
                      <Feather name="plus" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedUser && (
                <View style={s.selectedUserCard}>
                  <View style={s.selectedUserRow}>
                    <View style={s.userAvatar}>
                      <Text style={s.userAvatarText}>{selectedUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userName}>{selectedUser.name}</Text>
                      <Text style={s.userSub}>@{selectedUser.username}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedUser(null); setSearchQuery(''); }}>
                      <Feather name="x" size={18} color={colors.textDisabled} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[s.label, { marginTop: spacing.md, marginBottom: spacing.xs }]}>Permissão</Text>
                  <View style={s.permRow}>
                    <TouchableOpacity style={[s.permOption, selectedPerm === 'view' && s.permOptionActive]} onPress={() => setSelectedPerm('view')}>
                      <Feather name="eye" size={16} color={selectedPerm === 'view' ? colors.primary : colors.textSecondary} />
                      <View style={{ marginLeft: spacing.sm }}>
                        <Text style={[s.permOptionTitle, selectedPerm === 'view' && { color: colors.primary }]}>Somente visualizar</Text>
                        <Text style={s.permOptionDesc}>Pode ver o roteiro e atividades</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.permOption, selectedPerm === 'edit' && s.permOptionActive]} onPress={() => setSelectedPerm('edit')}>
                      <Feather name="edit-2" size={16} color={selectedPerm === 'edit' ? colors.primary : colors.textSecondary} />
                      <View style={{ marginLeft: spacing.sm }}>
                        <Text style={[s.permOptionTitle, selectedPerm === 'edit' && { color: colors.primary }]}>Pode editar</Text>
                        <Text style={s.permOptionDesc}>Adiciona e remove atividades</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={s.shareConfirmBtn} onPress={handleShare} disabled={shareLoading}>
                    {shareLoading
                      ? <ActivityIndicator size="small" color="white" />
                      : (<><Feather name="user-check" size={16} color="white" /><Text style={s.shareConfirmText}>Compartilhar com {selectedUser.name.split(' ')[0]}</Text></>)}
                  </TouchableOpacity>
                </View>
              )}
              {shareMembers.length > 0 && (
                <>
                  <Text style={[s.shareSection, { marginTop: spacing.lg }]}>Com acesso ({shareMembers.length})</Text>
                  <View style={s.membersCard}>
                    {shareMembers.map((member, index) => (
                      <View key={member.userId} style={[s.memberRow, index < shareMembers.length - 1 && s.memberRowBorder]}>
                        <View style={s.userAvatar}>
                          <Text style={s.userAvatarText}>{member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.userName}>{member.name}</Text>
                          <Text style={s.userSub}>@{member.username}</Text>
                        </View>
                        <View style={[s.permBadge, member.permission === 'edit' && s.permBadgeEdit]}>
                          <Feather name={member.permission === 'edit' ? 'edit-2' : 'eye'} size={10} color={member.permission === 'edit' ? colors.success : colors.textSecondary} />
                          <Text style={[s.permBadgeText, member.permission === 'edit' && s.permBadgeTextEdit]}>{' '}{member.permission === 'edit' ? 'Editor' : 'Leitor'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setConfirmRemoveMember(member)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: spacing.sm }}>
                          <Feather name="user-x" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {shareMembers.length === 0 && (
                <View style={s.emptyShare}>
                  <Feather name="users" size={32} color={colors.textDisabled} />
                  <Text style={s.emptyShareText}>Ninguém tem acesso ainda.</Text>
                  <Text style={s.emptyShareSub}>Use o campo acima para convidar alguém.</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          CONTEXT MENU
          statusBarTranslucent garante que o overlay cobre
          toda a tela no Android, incluindo a barra de navegação
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowContextMenu(false)}
      >
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowContextMenu(false)}>
          <View style={[s.menuSheet, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={s.menuItem} onPress={openEditItinerary}>
              <Feather name="edit-2" size={18} color={colors.textPrimary} />
              <Text style={[s.menuItemText, { color: colors.textPrimary }]}>Editar roteiro</Text>
            </TouchableOpacity>
            <View style={[s.menuDivider, { backgroundColor: colors.divider }]} />
            <TouchableOpacity style={s.menuItem} onPress={() => { setShowContextMenu(false); setConfirmDeleteItinerary(true); }}>
              <Feather name="trash-2" size={18} color={colors.danger} />
              <Text style={[s.menuItemText, { color: colors.danger }]}>Excluir roteiro</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: EDITAR ROTEIRO
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showEditItinerary} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditItinerary(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditItinerary(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Editar Roteiro</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[s.editPreview, { backgroundColor: editItinColor }]}>
                <MaterialCommunityIcons name={editItinEmotion as any} size={36} color="white" />
                <View style={{ flex: 1 }}>
                  <Text style={s.editPreviewTitle} numberOfLines={1}>{editItinTitle || 'Nome do roteiro'}</Text>
                  <Text style={s.editPreviewDest} numberOfLines={1}>{editItinDest || 'Destino'}</Text>
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Título *</Text>
                <TextInput style={[s.input, !!editItinTitleErr && s.inputError]} placeholder="Nome do roteiro" placeholderTextColor={colors.textDisabled} value={editItinTitle} onChangeText={t => { setEditItinTitle(t); setEditItinTitleErr(''); }} />
                {editItinTitleErr ? <Text style={s.errorText}>{editItinTitleErr}</Text> : null}
              </View>
              <View style={s.field}>
                <Text style={s.label}>Destino *</Text>
                <View style={[s.inputRow, !!editItinDestErr && s.inputError]}>
                  <Feather name="map-pin" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
                  <TextInput style={s.inputFlex} placeholder="Ex: Paris, França" placeholderTextColor={colors.textDisabled} value={editItinDest} onChangeText={t => { setEditItinDest(t); setEditItinDestErr(''); }} />
                </View>
                {editItinDestErr ? <Text style={s.errorText}>{editItinDestErr}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>Início *</Text>
                  <View style={[s.inputRow, !!editItinStartErr && s.inputError]}>
                    <Feather name="calendar" size={15} color={colors.textDisabled} style={{ marginRight: 6 }} />
                    <TextInput style={s.inputFlex} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textDisabled} value={editItinStartDisplay} onChangeText={text => { const { display, iso } = formatDateInput(text); setEditItinStartDisplay(display); setEditItinStart(iso); setEditItinStartErr(''); }} keyboardType="numeric" maxLength={10} />
                  </View>
                  {editItinStartErr ? <Text style={s.errorText}>{editItinStartErr}</Text> : null}
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>Fim *</Text>
                  <View style={[s.inputRow, !!editItinEndErr && s.inputError]}>
                    <Feather name="calendar" size={15} color={colors.textDisabled} style={{ marginRight: 6 }} />
                    <TextInput style={s.inputFlex} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textDisabled} value={editItinEndDisplay} onChangeText={text => { const { display, iso } = formatDateInput(text); setEditItinEndDisplay(display); setEditItinEnd(iso); setEditItinEndErr(''); }} keyboardType="numeric" maxLength={10} />
                  </View>
                  {editItinEndErr ? <Text style={s.errorText}>{editItinEndErr}</Text> : null}
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Ícone</Text>
                <TouchableOpacity style={s.selectBtn} onPress={() => setShowEditIconModal(true)}>
                  <MaterialCommunityIcons name={editItinEmotion as any} size={22} color={editItinColor} />
                  <Text style={s.selectBtnText}>{EMOTION_OPTIONS.find(e => e.value === editItinEmotion)?.label ?? 'Selecionar'}</Text>
                  <Feather name="chevron-right" size={18} color={colors.textDisabled} />
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Cor de capa</Text>
                <View style={s.colorRow}>
                  {COVER_COLORS.map(c => (
                    <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, editItinColor === c && s.colorDotSelected]} onPress={() => setEditItinColor(c)}>
                      {editItinColor === c && <Feather name="check" size={14} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEditItinerary(false)}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleEditItinerary} disabled={editItinLoading}>
                  {editItinLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={s.saveText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Seletor de ícone */}
      <Modal visible={showEditIconModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditIconModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditIconModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Escolher ícone</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catList} style={s.catScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[s.catChip, editIconCategory === cat && s.catChipActive]} onPress={() => setEditIconCategory(cat)}>
                  <Text style={[s.catChipText, editIconCategory === cat && s.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={EMOTION_OPTIONS.filter(e => e.category === editIconCategory)}
              keyExtractor={i => i.value}
              numColumns={5}
              contentContainerStyle={s.iconGrid}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.iconItem, editItinEmotion === item.value && s.iconItemSelected]} onPress={() => { setEditItinEmotion(item.value); setShowEditIconModal(false); }}>
                  <MaterialCommunityIcons name={item.value as any} size={26} color={editItinEmotion === item.value ? colors.primary : colors.textSecondary} />
                  <Text style={[s.iconLabel, editItinEmotion === item.value && s.iconLabelSelected]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: DIAS PERDIDOS (>5)
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showLostDaysModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLostDaysModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowLostDaysModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{lostDaysInfo.length} dias serão removidos</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={[s.modalScroll, { paddingBottom: 0 }]} showsVerticalScrollIndicator={false}>
              <View style={[s.lostDaysWarning, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
                <Feather name="alert-triangle" size={16} color={colors.danger} />
                <Text style={[s.lostDaysWarningText, { color: colors.danger }]}>Os dias abaixo serão excluídos junto com suas atividades.</Text>
              </View>
              {lostDaysInfo.map((d, i) => (
                <View key={i} style={[s.lostDayRow, { borderBottomColor: colors.divider }]}>
                  <View style={[s.lostDayBadge, { backgroundColor: colors.danger + '18' }]}>
                    <Text style={[s.lostDayBadgeNum, { color: colors.danger }]}>{d.dayNumber}</Text>
                    <Text style={[s.lostDayBadgeLabel, { color: colors.danger }]}>DIA</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.lostDayDate, { color: colors.textPrimary }]}>{d.dateStr}</Text>
                    {d.actCount > 0
                      ? <Text style={[s.lostDayActs, { color: colors.textSecondary }]}>{d.actCount} atividade{d.actCount > 1 ? 's' : ''}</Text>
                      : <Text style={[s.lostDayActs, { color: colors.textDisabled }]}>Sem atividades</Text>}
                  </View>
                  {d.actCount > 0
                    ? <Feather name="trash-2" size={13} color={colors.danger} style={{ opacity: 0.5 }} />
                    : <Feather name="minus" size={13} color={colors.textDisabled} />}
                </View>
              ))}
            </ScrollView>
            <View style={[s.lostDaysFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              {lostActivitiesTotal > 0 && (
                <Text style={[s.lostDaysTotal, { color: colors.danger }]}>
                  Total: {lostActivitiesTotal} atividade{lostActivitiesTotal > 1 ? 's' : ''} será{lostActivitiesTotal > 1 ? 'ão' : ''} perdida{lostActivitiesTotal > 1 ? 's' : ''}.
                </Text>
              )}
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowLostDaysModal(false)}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.danger }]} onPress={() => { setShowLostDaysModal(false); doSaveItinerary(); }}>
                  <Text style={s.saveText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Deletar atividade */}
      <ConfirmModal
        visible={confirmDeleteActivity !== null}
        title="Excluir atividade"
        message="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmDanger
        colors={colors}
        onCancel={() => setConfirmDeleteActivity(null)}
        onConfirm={() => { const id = confirmDeleteActivity!; setConfirmDeleteActivity(null); doDeleteActivity(id); }}
      />

      {/* Deletar roteiro */}
      <ConfirmModal
        visible={confirmDeleteItinerary}
        title="Excluir roteiro"
        message={`Tem certeza que deseja excluir "${itinerary?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmDanger
        colors={colors}
        onCancel={() => setConfirmDeleteItinerary(false)}
        onConfirm={() => { setConfirmDeleteItinerary(false); doDeleteItinerary(); }}
      />

      {/* Remover membro */}
      <ConfirmModal
        visible={confirmRemoveMember !== null}
        title="Remover acesso"
        message={`Remover acesso de ${confirmRemoveMember?.name}?`}
        confirmLabel="Remover"
        confirmDanger
        colors={colors}
        onCancel={() => setConfirmRemoveMember(null)}
        onConfirm={() => { const m = confirmRemoveMember!; setConfirmRemoveMember(null); doRemoveShare(m); }}
      />

      {/* Confirmar dias perdidos (≤5 dias) */}
      <ConfirmModal
        visible={confirmLostDays}
        title="Dias serão removidos"
        message={
          lostDaysInfo.map(d => {
            const actStr = d.actCount > 0 ? ` (${d.actCount} atividade${d.actCount > 1 ? 's' : ''})` : '';
            return `• Dia ${d.dayNumber} — ${d.dateStr}${actStr}`;
          }).join('\n') +
          (lostActivitiesTotal > 0 ? `\n\nTotal: ${lostActivitiesTotal} atividade${lostActivitiesTotal > 1 ? 's' : ''} será${lostActivitiesTotal > 1 ? 'ão' : ''} perdida${lostActivitiesTotal > 1 ? 's' : ''}.` : '')
        }
        confirmLabel="Confirmar"
        confirmDanger
        colors={colors}
        onCancel={() => setConfirmLostDays(false)}
        onConfirm={() => { setConfirmLostDays(false); doSaveItinerary(); }}
      />

      {/* Erro genérico */}
      <Modal visible={errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(false)}>
        <TouchableOpacity style={cmS(colors).overlay} activeOpacity={1} onPress={() => setErrorModal(false)}>
          <View style={cmS(colors).sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Feather name="alert-circle" size={20} color={colors.danger} />
              <Text style={[cmS(colors).title, { marginBottom: 0 }]}>Erro</Text>
            </View>
            <Text style={cmS(colors).message}>{errorMessage}</Text>
            <TouchableOpacity style={[cmS(colors).confirmBtn, { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, flex: 0 }]} onPress={() => setErrorModal(false)}>
              <Text style={cmS(colors).confirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sucesso compartilhamento */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => setSuccessModal(false)}>
        <TouchableOpacity style={cmS(colors).overlay} activeOpacity={1} onPress={() => setSuccessModal(false)}>
          <View style={cmS(colors).sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Feather name="check-circle" size={20} color={colors.success} />
              <Text style={[cmS(colors).title, { marginBottom: 0 }]}>Compartilhado!</Text>
            </View>
            <Text style={cmS(colors).message}>{successMessage}</Text>
            <TouchableOpacity style={[cmS(colors).confirmBtn, { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, flex: 0 }]} onPress={() => setSuccessModal(false)}>
              <Text style={cmS(colors).confirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const makeStyles = (colors: Colors, bottomInset: number = 0) =>
  StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.background },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center', marginHorizontal: spacing.sm },

    banner:      { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
    bannerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: 'white' },
    bannerDest:  { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
    bannerDates: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)' },
    permPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: spacing.sm },
    permPillText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)', fontWeight: fontWeight.medium },
    bannerMenuBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: radius.full },
    bannerGap:   { height: spacing.lg },

    daysList:      { paddingBottom: spacing.xxl },
    dayCard:       { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.sm, marginHorizontal: spacing.md, overflow: 'hidden', ...shadow.sm },
    dayHeader:     { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
    dayBadge:      { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
    dayBadgeNum:   { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: 'white', lineHeight: 20 },
    dayBadgeLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: fontWeight.medium },
    dayInfo:       { flex: 1 },
    dayTitle:      { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    daySubtitle:   { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    dayContent:    { borderTopWidth: 1, borderTopColor: colors.divider, paddingHorizontal: spacing.md, paddingBottom: spacing.md },

    periodSection: { marginTop: spacing.md },
    periodHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    periodLabel:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

    activityItem:  { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
    activityDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 },
    activityBody:  { flex: 1 },
    activityTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, flex: 1 },
    activityMeta:  { fontSize: fontSize.xs, color: colors.textSecondary },
    activityNotes: { fontSize: fontSize.xs, color: colors.textDisabled, marginTop: 2, fontStyle: 'italic' },

    addActivityBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', alignSelf: 'flex-start' },
    addActivityText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
    emptyDay:        { fontSize: fontSize.sm, color: colors.textDisabled, marginTop: spacing.md, fontStyle: 'italic' },
    center:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, marginHorizontal: spacing.md },
    emptyText:       { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },

    modalSafe:    { flex: 1 },
    modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle:   { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
    modalScroll:  { padding: spacing.lg, paddingBottom: spacing.xxl },

    field:      { marginBottom: spacing.md },
    label:      { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs },
    hint:       { fontSize: fontSize.xs, color: colors.textDisabled, marginTop: 4 },
    input:      { backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.textPrimary },
    textarea:   { height: 80, paddingTop: 12 },
    inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 12 },
    inputFlex:  { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, padding: 0 },
    inputError: { borderColor: colors.danger },
    errorText:  { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
    modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn:    { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    cancelText:   { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
    saveBtn:      { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
    saveText:     { fontSize: fontSize.md, color: 'white', fontWeight: fontWeight.semibold },

    shareSection:     { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textDisabled, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm },
    searchBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm },
    searchInput:      { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, padding: 0 },
    searchResultsBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.sm },

    userAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    userAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: 'white' },
    userName:       { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    userSub:        { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },

    selectedUserCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary, marginBottom: spacing.md, ...shadow.sm },
    selectedUserRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

    permRow:          { gap: spacing.sm, marginBottom: spacing.md },
    permOption:       { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBg },
    permOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    permOptionTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    permOptionDesc:   { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

    shareConfirmBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm + 4 },
    shareConfirmText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: 'white' },

    membersCard:     { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm, marginBottom: spacing.md },
    memberRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: spacing.sm },
    memberRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    permBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.divider, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
    permBadgeEdit:   { backgroundColor: colors.success + '22' },
    permBadgeText:   { fontSize: fontSize.xs, color: colors.textSecondary },
    permBadgeTextEdit: { color: colors.success },

    emptyShare:     { alignItems: 'center', paddingVertical: spacing.xl },
    emptyShareText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary, marginTop: spacing.md },
    emptyShareSub:  { fontSize: fontSize.sm, color: colors.textDisabled, marginTop: spacing.xs },

    menuOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    menuSheet:    { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: bottomInset, paddingTop: spacing.xs },
    menuItem:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2 },
    menuItemText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    menuDivider:  { height: 1, marginHorizontal: spacing.lg },

    editPreview:      { borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    editPreviewTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: 'white' },
    editPreviewDest:  { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    selectBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
    selectBtnText:    { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
    colorRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    colorDot:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorDotSelected: { borderWidth: 3, borderColor: 'white', ...shadow.sm },
    catScroll:        { maxHeight: 44 },
    catList:          { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs, alignItems: 'center' },
    catChip:          { paddingVertical: 5, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.divider },
    catChipActive:    { backgroundColor: colors.primaryLight },
    catChipText:      { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
    catChipTextActive:{ color: colors.primary, fontWeight: fontWeight.semibold },
    iconGrid:         { paddingHorizontal: spacing.xs, paddingBottom: spacing.xxl },
    iconItem:         { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, margin: 3, borderRadius: radius.sm, backgroundColor: colors.card },
    iconItemSelected: { backgroundColor: colors.primaryLight },
    iconLabel:        { fontSize: 9, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },
    iconLabelSelected:{ color: colors.primary, fontWeight: fontWeight.medium },

    lostDaysWarning:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    lostDaysWarningText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    lostDayRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1 },
    lostDayBadge:        { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
    lostDayBadgeNum:     { fontSize: fontSize.md, fontWeight: fontWeight.bold, lineHeight: 18 },
    lostDayBadgeLabel:   { fontSize: 9, fontWeight: fontWeight.medium },
    lostDayDate:         { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    lostDayActs:         { fontSize: fontSize.xs, marginTop: 2 },
    lostDaysFooter:      { borderTopWidth: 1, padding: spacing.lg, paddingBottom: spacing.xl },
    lostDaysTotal:       { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: spacing.md, textAlign: 'center' },

    offlineBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: '#F59E0B', paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md },
    offlineBannerText: { fontSize: fontSize.xs, color: '#fff', fontWeight: fontWeight.medium },
  });

export default ItineraryDetailScreen;