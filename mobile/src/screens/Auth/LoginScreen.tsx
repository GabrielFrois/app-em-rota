import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { spacing, fontSize, fontWeight, radius } from '../../styles/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const colors = useColors();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [emailError, setEmailError] = useState('');
  const [passError, setPassError]   = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (email)    setEmailError(''); }, [email]);
  useEffect(() => { if (password) setPassError('');  }, [password]);

  const validate = () => {
    let valid = true;
    setGeneralError('');
    if (!email.trim()) {
      setEmailError('O e-mail é obrigatório'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Informe um e-mail válido'); valid = false;
    }
    if (!password.trim()) {
      setPassError('A senha é obrigatória'); valid = false;
    } else if (password.length < 6) {
      setPassError('Mínimo 6 caracteres'); valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg: string = err.message ?? '';
      const isNetwork =
        msg.includes('Sem conexão') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('connect') ||
        msg.toLowerCase().includes('timeout');

      if (isNetwork) {
        setGeneralError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else if (
        msg.includes('E-mail ou senha incorretos') ||
        msg.includes('incorrect') ||
        msg.includes('invalid') ||
        msg.includes('401')
      ) {
        setGeneralError(msg || 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
      } else {
        setGeneralError(msg || 'Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={{ width: 120, height: 120, resizeMode: 'contain' }}
            />
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Planeje. Compartilhe. Explore.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Entrar na sua conta</Text>

            {generalError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '22' }]}>
                <Text style={[styles.errorBannerText, { color: colors.danger }]}>⚠️  {generalError}</Text>
              </View>
            ) : null}

            <Input
              label="E-mail" placeholder="seu@email.com"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoComplete="email" autoCorrect={false}
              error={emailError}
            />
            <Input
              label="Senha" placeholder="Sua senha"
              value={password} onChangeText={setPassword}
              returnKeyType="done" onSubmitEditing={handleLogin}
              isPassword maxLength={20} error={passError}
            />

            <Button title="Entrar" onPress={handleLogin} loading= {isSubmitting || isLoading} size="lg" style={{ marginTop: spacing.md }} />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Ainda não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  scroll:    { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  header:    { alignItems: 'center', marginBottom: spacing.xl },
  emoji:     { fontSize: 52, marginBottom: spacing.sm },
  appName:   { fontSize: 32, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  tagline:   { fontSize: fontSize.sm, marginTop: spacing.xs },
  card:      { borderRadius: 20, padding: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.lg },
  errorBanner:     { borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  errorBannerText: { fontSize: fontSize.sm },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { fontSize: fontSize.sm },
  footerLink: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});

export default LoginScreen;