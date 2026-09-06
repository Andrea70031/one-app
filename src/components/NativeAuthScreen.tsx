import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOneAuth } from '../native/auth';
import { colors } from '../theme/colors';

type Mode = 'login' | 'signup';

export function NativeAuthScreen() {
  const { signIn, signUp, sendPasswordReset } = useOneAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Controlla i dati', 'Inserisci una email valida e una password di almeno 6 caratteri.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const result = await signUp(email, password, fullName);
        if (result === 'confirmation_required') {
          Alert.alert('Controlla la tua email', 'Ti abbiamo inviato il link per confermare l’account ONE. Dopo la conferma torna qui e accedi.');
          setMode('login');
        }
      }
    } catch (error) {
      Alert.alert('Accesso non riuscito', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      Alert.alert('Inserisci la tua email', 'ONE userà questo indirizzo per inviarti il recupero password.');
      return;
    }
    try {
      await sendPasswordReset(email);
      Alert.alert('Email inviata', 'Controlla la posta per reimpostare la password.');
    } catch (error) {
      Alert.alert('Invio non riuscito', error instanceof Error ? error.message : 'Riprova tra poco.');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#07101B', colors.background, '#040509']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.logoOrb}>
          <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.logoGradient}>
            <View style={styles.logoInner} />
          </LinearGradient>
        </View>
        <Text style={styles.brand}>O N E</Text>
        <Text style={styles.title}>{mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}</Text>
        <Text style={styles.subtitle}>Il tuo centro di comando personale e professionale.</Text>

        <View style={styles.card}>
          {mode === 'signup' && (
            <View style={styles.field}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Nome" placeholderTextColor="#687080" style={styles.input} autoCapitalize="words" />
            </View>
          )}
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#687080" style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
          </View>
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#687080" style={styles.input} secureTextEntry textContentType={mode === 'login' ? 'password' : 'newPassword'} onSubmitEditing={submit} returnKeyType="go" />
          </View>

          <Pressable onPress={submit} disabled={busy} style={[styles.primary, busy && styles.disabled]}>
            <LinearGradient colors={[colors.blue, colors.violet]} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>{busy ? 'Attendi…' : mode === 'login' ? 'Accedi a ONE' : 'Crea account'}</Text>
            </LinearGradient>
          </Pressable>

          {mode === 'login' && <Pressable onPress={reset}><Text style={styles.link}>Password dimenticata?</Text></Pressable>}
        </View>

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.switchText}>{mode === 'login' ? 'Non hai un account?  ' : 'Hai già un account?  '}<Text style={styles.switchStrong}>{mode === 'login' ? 'Crealo' : 'Accedi'}</Text></Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoOrb: { width: 72, height: 72, alignSelf: 'center' },
  logoGradient: { flex: 1, borderRadius: 36, padding: 3 },
  logoInner: { flex: 1, borderRadius: 33, backgroundColor: '#070A10' },
  brand: { marginTop: 18, textAlign: 'center', color: colors.text, fontSize: 17, letterSpacing: 8, paddingLeft: 8, fontWeight: '600' },
  title: { marginTop: 32, color: colors.text, fontSize: 29, fontWeight: '600', textAlign: 'center' },
  subtitle: { marginTop: 9, color: colors.textMuted, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  card: { marginTop: 28, gap: 12 },
  field: { height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  input: { flex: 1, color: colors.text, fontSize: 15.5 },
  primary: { height: 56, marginTop: 4, borderRadius: 18, overflow: 'hidden' },
  primaryGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  link: { color: '#B995FF', fontSize: 13, textAlign: 'center', paddingVertical: 6 },
  switchText: { marginTop: 24, color: colors.textMuted, fontSize: 13.5, textAlign: 'center' },
  switchStrong: { color: colors.text, fontWeight: '700' },
});
