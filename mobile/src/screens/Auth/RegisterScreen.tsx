import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { spacing, fontSize, fontWeight, radius } from '../../styles/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, isLoading } = useAuth();
  const colors = useColors();
  const confirmRef = useRef<TextInput>(null);

  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [generalError, setGeneralError] = useState('');

  const [nameError, setNameError]         = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError]       = useState('');
  const [passError, setPassError]         = useState('');
  const [confirmError, setConfirmError]   = useState('');

  useEffect(() => { if (name)     setNameError('');     }, [name]);
  useEffect(() => { if (username) setUsernameError(''); }, [username]);
  useEffect(() => { if (email)    setEmailError('');    }, [email]);
  useEffect(() => { if (password) setPassError('');     }, [password]);
  useEffect(() => { if (confirm)  setConfirmError('');  }, [confirm]);

  const validate = () => {
    let valid = true;
    setGeneralError('');
    if (!name.trim())     { setNameError('Nome é obrigatório'); valid = false; }
    if (!username.trim()) { setUsernameError('Username é obrigatório'); valid = false; }
    else if (!/^[a-z0-9_]+$/.test(username)) { setUsernameError('Apenas letras minúsculas, números e _'); valid = false; }
    if (!email.trim())    { setEmailError('E-mail é obrigatório'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('E-mail inválido'); valid = false; }
    if (!password.trim()) { setPassError('Senha é obrigatória'); valid = false; }
    else if (password.length < 6) { setPassError('Mínimo 6 caracteres'); valid = false; }
    if (password !== confirm) { setConfirmError('As senhas não coincidem'); valid = false; }
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(name.trim(), username.trim(), email.trim(), password);
    } catch (err: any) {
      setGeneralError(err.message ?? 'Erro ao criar conta');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={{ width: 120, height: 120, resizeMode: 'contain' }}
            />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Junte-se ao Em Rota e comece a planejar</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {generalError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '22' }]}>
                <Text style={[styles.errorBannerText, { color: colors.danger }]}>⚠️  {generalError}</Text>
              </View>
            ) : null}

            <Input label="Nome completo" placeholder="Seu nome" value={name} onChangeText={setName} autoCapitalize="words" autoCorrect={false} error={nameError} />
            <Input label="Username" placeholder="ex: joaosilva" value={username} onChangeText={t => setUsername(t.toLowerCase())} autoCorrect={false} error={usernameError} />
            <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCorrect={false} error={emailError} />
            <Input label="Senha" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} isPassword returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} maxLength={20} error={passError} />
            <Input label="Confirmar senha" placeholder="Repita a senha" value={confirm} onChangeText={setConfirm} isPassword returnKeyType="done" onSubmitEditing={handleRegister} maxLength={20} error={confirmError} ref={confirmRef} />

            <Button title="Criar conta" onPress={handleRegister} loading={isLoading} size="lg" style={{ marginTop: spacing.xs }} />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Entrar</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  header:   { alignItems: 'center', marginBottom: spacing.xl },
  emoji:    { fontSize: 48, marginBottom: spacing.sm },
  title:    { fontSize: 28, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
  card:     { borderRadius: 20, padding: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  errorBanner:     { borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  errorBannerText: { fontSize: fontSize.sm },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { fontSize: fontSize.sm },
  footerLink: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});

export default RegisterScreen;