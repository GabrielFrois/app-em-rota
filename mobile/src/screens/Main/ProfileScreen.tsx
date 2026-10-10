import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useColors } from '../../hooks/useColors';
import { lightColors, fontSize, fontWeight, radius, shadow, spacing } from '../../styles/theme';

type Colors = typeof lightColors;

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const colors = useColors();

  const [showEditModal, setShowEditModal]     = useState(false);
  const [showPassModal, setShowPassModal]     = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editName, setEditName]             = useState(user?.name ?? '');
  const [editUsername, setEditUsername]     = useState(user?.username ?? '');
  const [currentPass, setCurrentPass]       = useState('');
  const [newPass, setNewPass]               = useState('');
  const [confirmPass, setConfirmPass]       = useState('');
  const [passError, setPassError]           = useState('');
  const newPassRef     = React.useRef<import('react-native').TextInput>(null);
  const confirmPassRef = React.useRef<import('react-native').TextInput>(null);
  const [saving, setSaving]                 = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = () => setShowLogoutModal(true);

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Erro', 'Nome é obrigatório'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setShowEditModal(false);
    Alert.alert('Sucesso', 'Perfil atualizado!');
  };

  const handleChangePassword = async () => {
    setPassError('');
    if (!currentPass) { setPassError('Informe a senha atual'); return; }
    if (newPass.length < 6) { setPassError('Nova senha deve ter mínimo 6 caracteres'); return; }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setShowPassModal(false);
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    Alert.alert('Sucesso', 'Senha alterada com sucesso!');
  };

  const s = makeStyles(colors);

  const menuItems = [
    { icon: 'edit-2' as const, label: 'Editar perfil', onPress: () => setShowEditModal(true) },
    { icon: 'lock' as const,   label: 'Alterar senha', onPress: () => setShowPassModal(true) },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Perfil</Text>
        </View>

        {/* Card do perfil */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.username}>@{user?.username}</Text>
          <Text style={s.email}>{user?.email}</Text>
        </View>

        {/* Seção: Aparência */}
        <View style={s.sectionLabel}>
          <Text style={s.sectionLabelText}>APARÊNCIA</Text>
        </View>
        <View style={s.section}>
          <View style={s.themeRow}>
            <View style={s.menuIconWrap}>
              <Feather name={isDark ? 'moon' : 'sun'} size={18} color={colors.primary} />
            </View>
            <Text style={s.menuLabel}>Modo escuro</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : colors.textDisabled}
            />
          </View>
        </View>

        {/* Seção: Conta */}
        <View style={s.sectionLabel}>
          <Text style={s.sectionLabelText}>CONTA</Text>
        </View>
        <View style={s.section}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.icon}
              style={[s.menuItem, index === menuItems.length - 1 && s.menuItemLast]}
              onPress={item.onPress}
            >
              <View style={s.menuIconWrap}>
                <Feather name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.logoutContainer}>
          <Button title="Sair da conta" onPress={handleLogout} variant="danger" size="lg" />
        </View>
      </ScrollView>

      {/* Modal editar perfil */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Editar perfil</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Input label="Nome completo" value={editName} onChangeText={setEditName} autoCapitalize="words" />
              <Input label="Username" value={editUsername} onChangeText={t => setEditUsername(t.toLowerCase())} autoCorrect={false} />
              <Button title="Salvar alterações" onPress={handleSaveProfile} loading={saving} size="lg" style={{ marginTop: spacing.md }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal alterar senha */}
      <Modal visible={showPassModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={s.modalSafe} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowPassModal(false)}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Alterar senha</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              {passError ? (
                <View style={s.errorBanner}>
                  <Text style={s.errorBannerText}>⚠️  {passError}</Text>
                </View>
              ) : null}
              <Input
                label="Senha atual"
                value={currentPass}
                onChangeText={setCurrentPass}
                isPassword
                returnKeyType="next"
                onSubmitEditing={() => newPassRef.current?.focus()}
              />
              <Input
                label="Nova senha"
                value={newPass}
                onChangeText={setNewPass}
                isPassword
                returnKeyType="next"
                onSubmitEditing={() => confirmPassRef.current?.focus()}
                ref={newPassRef}
              />
              <Input
                label="Confirmar nova senha"
                value={confirmPass}
                onChangeText={setConfirmPass}
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
                ref={confirmPassRef}
              />
              <Button title="Alterar senha" onPress={handleChangePassword} loading={saving} size="lg" style={{ marginTop: spacing.md }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal de confirmação de logout */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowLogoutModal(false)}>
          <View style={[s.logoutSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.logoutIconWrap, { backgroundColor: colors.danger + '18' }]}>
              <Feather name="log-out" size={24} color={colors.danger} />
            </View>
            <Text style={[s.logoutSheetTitle, { color: colors.textPrimary }]}>Sair da conta</Text>
            <Text style={[s.logoutSheetSub, { color: colors.textSecondary }]}>Tem certeza que deseja sair?</Text>
            <View style={s.logoutSheetBtns}>
              <TouchableOpacity
                style={[s.logoutCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[s.logoutCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.logoutConfirmBtn, { backgroundColor: colors.danger }]}
                onPress={() => { setShowLogoutModal(false); logout(); }}
              >
                <Text style={s.logoutConfirmText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.background },
    header:      { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary },

    profileCard: { alignItems: 'center', backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: radius.xl, padding: spacing.xl, ...shadow.md, marginBottom: spacing.lg },
    avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
    avatarText:  { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: '#fff' },
    name:        { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
    username:    { fontSize: fontSize.md, color: colors.primary, marginTop: 2 },
    email:       { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

    sectionLabel:     { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
    sectionLabelText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textDisabled, letterSpacing: 0.8 },

    section:      { backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: radius.lg, ...shadow.sm, marginBottom: spacing.lg },
    themeRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    menuItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
    menuItemLast: { borderBottomWidth: 0 },
    menuIconWrap: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    menuLabel:    { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },

    logoutContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    modalSafe:   { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
    modalScroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    errorBanner:     { backgroundColor: colors.danger + '22', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
    errorBannerText: { color: colors.danger, fontSize: fontSize.sm },

    modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    logoutSheet:      { width: '100%', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center' },
    logoutIconWrap:   { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
    logoutSheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    logoutSheetSub:   { fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.xl },
    logoutSheetBtns:  { flexDirection: 'row', gap: spacing.sm, width: '100%' },
    logoutCancelBtn:  { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
    logoutCancelText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    logoutConfirmBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' },
    logoutConfirmText:{ fontSize: fontSize.md, color: 'white', fontWeight: fontWeight.semibold },
  });

export default ProfileScreen;