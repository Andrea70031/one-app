import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOneAuth } from '../native/auth';
import { colors } from '../theme/colors';

type Mode = 'login' | 'signup';

export function NativeAuthScreen() {
  const { signIn, signUp, sendPasswordReset, passwordRecovery, updatePassword, signOut } = useOneAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (passwordRecovery) {
      if (password.length < 8 || password !== confirmPassword) {
        Alert.alert('Controlla la password', 'Usa almeno 8 caratteri e ripeti la stessa password.');
        return;
      }
      setBusy(true);
      try { await updatePassword(password); setPassword(''); setConfirmPassword(''); }
      catch (error) { Alert.alert('Password non aggiornata', error instanceof Error ? error.message : 'Riprova.'); }
      finally { setBusy(false); }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < (mode === 'signup' ? 8 : 1)) {
      Alert.alert('Controlla i dati', 'Inserisci una email valida e la password. Per un nuovo account usa almeno 8 caratteri.');
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
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Inserisci la tua email', 'ONE userà questo indirizzo per inviarti il recupero password.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      Alert.alert('Controlla la posta', 'Se l’indirizzo è associato a un account, riceverai il link. Aprilo su questo iPhone per scegliere la nuova password.');
    } catch (error) {
      Alert.alert('Invio non riuscito', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#07101B', colors.background, '#040509']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.logoOrb}>
          <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.logoGradient}>
            <View style={styles.logoInner} />
          </LinearGradient>
        </View>
        <Text style={styles.brand}>O N E</Text>
        <Text style={styles.title}>{passwordRecovery ? 'Nuova password' : mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}</Text>
        <Text style={styles.subtitle}>Il tuo centro di comando personale e professionale.</Text>

        <View style={styles.card}>
          {!passwordRecovery && mode === 'signup' && (
            <View style={styles.field}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Nome" placeholderTextColor="#687080" style={styles.input} autoCapitalize="words" />
            </View>
          )}
          {!passwordRecovery && <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#687080" style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" accessibilityLabel="Email" />
          </View>}
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#687080" style={styles.input} secureTextEntry accessibilityLabel={passwordRecovery ? 'Nuova password' : 'Password'} textContentType={passwordRecovery || mode === 'signup' ? 'newPassword' : 'password'} onSubmitEditing={submit} returnKeyType="go" />
          </View>

          {passwordRecovery && <View style={styles.field}>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ripeti nuova password" placeholderTextColor="#687080" style={styles.input} secureTextEntry textContentType="newPassword" accessibilityLabel="Ripeti nuova password" onSubmitEditing={submit} />
          </View>}
          <Pressable onPress={submit} disabled={busy} style={[styles.primary, busy && styles.disabled]}>
            <LinearGradient colors={[colors.blue, colors.violet]} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>{busy ? 'Attendi…' : passwordRecovery ? 'Salva nuova password' : mode === 'login' ? 'Accedi a ONE' : 'Crea account'}</Text>
            </LinearGradient>
          </Pressable>

          {!passwordRecovery && mode === 'login' && <Pressable disabled={busy} onPress={reset}><Text style={styles.link}>Password dimenticata?</Text></Pressable>}
        </View>

        {!passwordRecovery && <Pressable disabled={busy} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.switchText}>{mode === 'login' ? 'Non hai un account?  ' : 'Hai già un account?  '}<Text style={styles.switchStrong}>{mode === 'login' ? 'Crealo' : 'Accedi'}</Text></Text>
        </Pressable>}
        {passwordRecovery && <Pressable disabled={busy} onPress={() => { void signOut().catch(() => Alert.alert('ONE', 'Riprova.')); }}><Text style={styles.link}>Annulla ed esci</Text></Pressable>}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          {['Privacy', 'Termini'].map((label, i) => <Pressable key={label} accessibilityRole="link" onPress={() => { void Linking.openURL(`https://andrea70031.github.io/one-app/${i ? 'terms' : 'privacy'}.html`).catch(() => Alert.alert('ONE', 'Pagina non disponibile. Riprova.')); }}><Text style={styles.link}>{label}</Text></Pressable>)}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
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
