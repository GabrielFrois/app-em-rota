import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import {
  FlatList, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { itineraryService } from '../../services/api';
import { useColors } from '../../hooks/useColors';
import { fontSize, fontWeight, radius, shadow, spacing, lightColors } from '../../styles/theme';
import { EMOTION_OPTIONS, ItineraryEmotion, ItineraryStackParamList } from '../../types';

type Colors = typeof lightColors;
type Props = NativeStackScreenProps<ItineraryStackParamList, 'CreateItinerary'>;

const COVER_COLORS = [
  '#2D6BE4', '#E84A4A', '#27AE60', '#F2994A',
  '#9B51E0', '#2D9CDB', '#EB5757', '#219653',
  '#F2C94C', '#BB6BD9', '#56CCF2', '#6FCF97',
];

const CATEGORIES = [...new Set(EMOTION_OPTIONS.map(e => e.category))];

const isNetworkError = (err: any): boolean => {
  const msg = (err?.message ?? '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('connect') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    err?.code === 'ERR_NETWORK'
  );
};

const CreateItineraryScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useColors();

  const [title, setTitle]               = useState('');
  const [destination, setDestination]   = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [startDisplay, setStartDisplay] = useState('');
  const [endDisplay, setEndDisplay]     = useState('');
  const [emotion, setEmotion]           = useState<ItineraryEmotion>('map-outline');
  const [coverColor, setCoverColor]     = useState(COVER_COLORS[0]);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const [titleError, setTitleError] = useState('');
  const [destError, setDestError]   = useState('');
  const [startError, setStartError] = useState('');
  const [endError, setEndError]     = useState('');

  // ── Modal de erro ────────────────────────────────────────────────────────
  const [errorModal, setErrorModal]     = useState(false);
  const [errorTitle, setErrorTitle]     = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModal(true);
  };

  useEffect(() => { if (title)       setTitleError(''); }, [title]);
  useEffect(() => { if (destination) setDestError('');  }, [destination]);
  useEffect(() => { if (startDate)   setStartError(''); }, [startDate]);
  useEffect(() => { if (endDate)     setEndError('');   }, [endDate]);

  const formatDateInput = (text: string): { display: string; iso: string } => {
    const nums = text.replace(/\D/g, '').slice(0, 8);
    let display = nums;
    if (nums.length > 2) display = nums.slice(0, 2) + '/' + nums.slice(2);
    if (nums.length > 4) display = nums.slice(0, 2) + '/' + nums.slice(2, 4) + '/' + nums.slice(4);
    const iso = nums.length === 8 ? `${nums.slice(4)}-${nums.slice(2, 4)}-${nums.slice(0, 2)}` : '';
    return { display, iso };
  };

  const validate = () => {
    let valid = true;
    if (!title.trim())       { setTitleError('Título é obrigatório'); valid = false; }
    if (!destination.trim()) { setDestError('Destino é obrigatório'); valid = false; }
    if (!startDate)          { setStartError('Informe a data de início'); valid = false; }
    if (!endDate)            { setEndError('Informe a data de fim'); valid = false; }
    if (startDate && endDate && endDate < startDate) { setEndError('Data de fim deve ser após o início'); valid = false; }
    return valid;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { itinerary } = await itineraryService.create({
        title: title.trim(), destination: destination.trim(),
        emotion, coverColor, startDate, endDate,
      });
      navigation.replace('ItineraryDetail', { itineraryId: itinerary.id });
    } catch (err: any) {
      if (isNetworkError(err)) {
        showError(
          'Sem conexão',
          'Não foi possível criar o roteiro pois você está sem internet.\n\nConecte-se à internet e tente novamente.'
        );
      } else {
        showError('Erro ao criar roteiro', err?.message ?? 'Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedEmotion  = EMOTION_OPTIONS.find(e => e.value === emotion);
  const filteredEmotions = EMOTION_OPTIONS.filter(e => e.category === activeCategory);
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Novo Roteiro</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Preview do card */}
        <View style={[s.preview, { backgroundColor: coverColor }]}>
          <MaterialCommunityIcons name={emotion as any} size={40} color="white" />
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle} numberOfLines={1}>{title || 'Nome do roteiro'}</Text>
            <Text style={s.previewDest} numberOfLines={1}>{destination || 'Destino'}</Text>
            {startDate && endDate && (
              <Text style={s.previewDates}>
                {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>
        </View>

        {/* Título */}
        <View style={s.field}>
          <Text style={s.label}>Título</Text>
          <TextInput
            style={[s.input, !!titleError && s.inputError]}
            placeholder="Ex: Férias em Floripa"
            placeholderTextColor={colors.textDisabled}
            value={title} onChangeText={setTitle} maxLength={100}
          />
          {titleError ? <Text style={s.errorText}>{titleError}</Text> : null}
        </View>

        {/* Destino */}
        <View style={s.field}>
          <Text style={s.label}>Destino</Text>
          <View style={[s.inputRow, !!destError && s.inputError]}>
            <Feather name="map-pin" size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={s.inputFlex}
              placeholder="Ex: Florianópolis, SC"
              placeholderTextColor={colors.textDisabled}
              value={destination} onChangeText={setDestination} maxLength={150}
            />
          </View>
          {destError ? <Text style={s.errorText}>{destError}</Text> : null}
        </View>

        {/* Datas lado a lado */}
        <View style={s.row}>
          <View style={[s.field, s.flex1, { marginRight: spacing.sm }]}>
            <Text style={s.label}>Início</Text>
            <View style={[s.inputRow, !!startError && s.inputError]}>
              <Feather name="calendar" size={15} color={colors.textDisabled} style={{ marginRight: 6 }} />
              <TextInput
                style={s.inputFlex}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textDisabled}
                value={startDisplay}
                onChangeText={text => {
                  const { display, iso } = formatDateInput(text);
                  setStartDisplay(display); setStartDate(iso);
                }}
                keyboardType="numeric" maxLength={10}
              />
            </View>
            {startError ? <Text style={s.errorText}>{startError}</Text> : null}
          </View>

          <View style={[s.field, s.flex1, { marginLeft: spacing.sm }]}>
            <Text style={s.label}>Fim</Text>
            <View style={[s.inputRow, !!endError && s.inputError]}>
              <Feather name="calendar" size={15} color={colors.textDisabled} style={{ marginRight: 6 }} />
              <TextInput
                style={s.inputFlex}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textDisabled}
                value={endDisplay}
                onChangeText={text => {
                  const { display, iso } = formatDateInput(text);
                  setEndDisplay(display); setEndDate(iso);
                }}
                keyboardType="numeric" maxLength={10}
              />
            </View>
            {endError ? <Text style={s.errorText}>{endError}</Text> : null}
          </View>
        </View>

        {/* Ícone */}
        <View style={s.field}>
          <Text style={s.label}>Ícone do roteiro</Text>
          <TouchableOpacity style={s.selectBtn} onPress={() => setShowModal(true)}>
            <MaterialCommunityIcons name={emotion as any} size={22} color={coverColor} />
            <Text style={s.selectBtnText}>{selectedEmotion?.label ?? 'Selecionar'}</Text>
            <Feather name="chevron-right" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        </View>

        {/* Cor */}
        <View style={s.field}>
          <Text style={s.label}>Cor de capa</Text>
          <View style={s.colorRow}>
            {COVER_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorDot, { backgroundColor: c }, coverColor === c && s.colorDotSelected]}
                onPress={() => setCoverColor(c)}
              >
                {coverColor === c && <Feather name="check" size={14} color="white" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button title="Criar Roteiro" onPress={handleCreate} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
      </ScrollView>

      {/* Modal seletor de ícone */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Escolher ícone</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catList} style={s.catScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[s.catChip, activeCategory === cat && s.catChipActive]} onPress={() => setActiveCategory(cat)}>
                  <Text style={[s.catChipText, activeCategory === cat && s.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={filteredEmotions}
              keyExtractor={i => i.value}
              numColumns={5}
              contentContainerStyle={s.iconGrid}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.iconItem, emotion === item.value && s.iconItemSelected]} onPress={() => { setEmotion(item.value); setShowModal(false); }}>
                  <MaterialCommunityIcons name={item.value as any} size={26} color={emotion === item.value ? colors.primary : colors.textSecondary} />
                  <Text style={[s.iconLabel, emotion === item.value && s.iconLabelSelected]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal de erro customizado */}
      <Modal visible={errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(false)}>
        <TouchableOpacity style={s.errorOverlay} activeOpacity={1} onPress={() => setErrorModal(false)}>
          <View style={[s.errorSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.errorIconWrap, { backgroundColor: errorTitle === 'Sem conexão' ? '#F59E0B22' : colors.danger + '22' }]}>
              <Feather
                name={errorTitle === 'Sem conexão' ? 'wifi-off' : 'alert-circle'}
                size={28}
                color={errorTitle === 'Sem conexão' ? '#F59E0B' : colors.danger}
              />
            </View>
            <Text style={[s.errorSheetTitle, { color: colors.textPrimary }]}>{errorTitle}</Text>
            <Text style={[s.errorSheetMessage, { color: colors.textSecondary }]}>{errorMessage}</Text>
            <TouchableOpacity style={[s.errorSheetBtn, { backgroundColor: colors.primary }]} onPress={() => setErrorModal(false)}>
              <Text style={s.errorSheetBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.background },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
    scroll:      { padding: spacing.lg, paddingBottom: spacing.xxl },

    preview:      { borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    previewTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: 'white' },
    previewDest:  { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    previewDates: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    field:     { marginBottom: spacing.md },
    row:       { flexDirection: 'row' },
    flex1:     { flex: 1 },
    label:     { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs },
    input:     { backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.textPrimary },
    inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 12 },
    inputFlex: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, padding: 0 },
    inputError:{ borderColor: colors.danger },
    errorText: { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },

    selectBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
    selectBtnText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },

    colorRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    colorDot:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorDotSelected: { borderWidth: 3, borderColor: 'white', ...shadow.sm },

    modalSafe:   { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },

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

    // Modal de erro
    errorOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    errorSheet:       { width: '100%', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center' },
    errorIconWrap:    { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
    errorSheetTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm, textAlign: 'center' },
    errorSheetMessage:{ fontSize: fontSize.md, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
    errorSheetBtn:    { width: '100%', paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' },
    errorSheetBtnText:{ fontSize: fontSize.md, color: 'white', fontWeight: fontWeight.semibold },
  });

export default CreateItineraryScreen;