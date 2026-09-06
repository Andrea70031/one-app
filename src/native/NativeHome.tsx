import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { OneOrb, OrbState } from '../components/OneOrb';
import { EnergyOrb } from '../components/EnergyOrb';
import { RecentActivity } from '../components/RecentActivity';
import { CaptureItem, CapturePreview } from '../components/CapturePreview';
import { NativeAIResponseCard } from '../components/NativeAIResponseCard';
import { colors } from '../theme/colors';
import { useOneAuth } from './auth';
import { askOneNative, OneAIResult } from './oneAI';
import { addOneActivity, dashboardRecentItems, loadNativeDashboard, NativeDashboard } from './oneData';

const stateSequence: OrbState[] = ['idle', 'activating', 'listening', 'thinking', 'done'];
const emptyDashboard: NativeDashboard = { activities: [], reminders: [], memories: [], sites: [] };

export function NativeHome() {
  const { user, profile, signOut } = useOneAuth();
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [input, setInput] = useState('');
  const [capture, setCapture] = useState<CaptureItem | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dashboard, setDashboard] = useState<NativeDashboard>(emptyDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [aiResult, setAiResult] = useState<OneAIResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const index = useMemo(() => stateSequence.indexOf(orbState), [orbState]);
  const recentItems = useMemo(() => dashboardRecentItems(dashboard), [dashboard]);
  const openReminders = useMemo(() => dashboard.reminders.filter((item) => !item.completed).length, [dashboard.reminders]);

  const firstName = useMemo(() => {
    const fullName = profile?.full_name?.trim();
    if (fullName) return fullName.split(/\s+/)[0];
    const email = user?.email || profile?.email || '';
    return email ? email.split('@')[0] : 'ciao';
  }, [profile, user]);

  const refreshDashboard = async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);
    try {
      setDashboard(await loadNativeDashboard(user.id));
    } catch (error) {
      if (!silent) Alert.alert('Sincronizzazione ONE', error instanceof Error ? error.message : 'Non riesco a caricare i dati.');
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDashboard(true);
  }, [user?.id]);

  useEffect(() => {
    if (orbState === 'activating') {
      const timer = setTimeout(() => setOrbState('listening'), 650);
      return () => clearTimeout(timer);
    }
    if (orbState === 'done') {
      const timer = setTimeout(() => setOrbState('idle'), 1800);
      return () => clearTimeout(timer);
    }
  }, [orbState]);

  const advanceOrb = () => {
    const next = stateSequence[(index + 1) % stateSequence.length];
    if (next) setOrbState(next);
  };

  const finishCapture = (item: CaptureItem) => {
    setCapture(item);
    setOrbState('done');
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Fotocamera non disponibile', 'Consenti a ONE di usare la fotocamera nelle impostazioni.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({ kind: 'camera', uri: asset.uri, name: asset.fileName ?? 'Foto scattata', detail: 'Immagine pronta per ONE' });
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Foto non disponibili', 'Consenti a ONE di accedere alle foto nelle impostazioni.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({ kind: 'photo', uri: asset.uri, name: asset.fileName ?? 'Immagine', detail: 'Immagine pronta per ONE' });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({ kind: 'document', uri: asset.uri, name: asset.name, detail: asset.mimeType ?? 'Documento selezionato' });
    }
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) return Alert.alert('Microfono non disponibile', 'Consenti a ONE di usare il microfono nelle impostazioni.');
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
        setOrbState('listening');
      } else {
        await recorder.stop();
        setIsRecording(false);
        finishCapture({ kind: 'audio', uri: recorder.uri ?? undefined, name: 'Registrazione vocale', detail: 'Audio acquisito da ONE' });
      }
    } catch {
      setIsRecording(false);
      setOrbState('idle');
      Alert.alert('Registrazione non riuscita', 'Riprova tra qualche secondo.');
    }
  };

  const submitText = async () => {
    const text = input.trim();
    if (!text || submitting || !user) {
      if (!text) setOrbState('activating');
      return;
    }
    setSubmitting(true);
    setOrbState('thinking');
    setAiResult(null);
    try {
      const result = await askOneNative({ text });
      setAiResult(result);
      setInput('');
      setOrbState('done');
      await addOneActivity(user.id, result.memory_title || 'Richiesta a ONE', result.memory_summary || result.summary.slice(0, 240), 'ai');
      await refreshDashboard(true);
    } catch (error) {
      setOrbState('idle');
      Alert.alert('ONE non ha completato la richiesta', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(profile?.full_name || user?.email || 'Account ONE', 'Vuoi uscire da questo account?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => signOut().catch((error) => Alert.alert('Logout', error.message)) },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#07101B', colors.background, '#040509']} locations={[0, 0.34, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => Alert.alert('ONE', `${openReminders} promemoria aperti · ${dashboard.sites.length} spazi · ${dashboard.memories.length} memorie`)}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.brand}>O N E</Text>
          <Pressable style={styles.avatar} onPress={confirmSignOut}>
            <LinearGradient colors={[colors.cyan, colors.violet, colors.pink]} style={styles.avatarGradient}>
              <View style={styles.avatarInner}><Ionicons name="person-outline" size={18} color={colors.text} /></View>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshDashboard(false)} tintColor={colors.cyan} />}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.greeting}>Ciao {firstName},</Text>
            <Text style={styles.tagline}>Mostrami, chiedi, delega.{`\n`}Io mi occupo del resto.</Text>
          </View>

          <OneOrb state={orbState} onPress={advanceOrb} />

          <View style={styles.askBar}>
            <View style={styles.spark}><Ionicons name="sparkles-outline" size={18} color={colors.cyan} /></View>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submitText}
              placeholder={submitting ? 'ONE sta pensando…' : 'Chiedi qualsiasi cosa…'}
              placeholderTextColor="#6F7786"
              style={styles.input}
              returnKeyType="send"
              editable={!submitting}
            />
            <Pressable onPress={toggleRecording} style={[styles.micButton, isRecording && styles.micButtonRecording]}>
              <Ionicons name={isRecording ? 'stop' : 'mic-outline'} size={19} color={isRecording ? colors.green : colors.text} />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <QuickAction icon="camera-outline" label="Mostra" onPress={takePhoto} />
            <QuickAction icon="document-outline" label="Documento" onPress={pickDocument} />
            <QuickAction icon="image-outline" label="Foto" onPress={pickPhoto} />
            <QuickAction icon={isRecording ? 'stop-circle-outline' : 'mic-outline'} label={isRecording ? 'Stop' : 'Parla'} onPress={toggleRecording} />
          </View>

          {capture && <CapturePreview item={capture} />}
          {aiResult && user && <NativeAIResponseCard result={aiResult} userId={user.id} onChanged={() => refreshDashboard(true)} />}

          <View style={styles.pulseRow}>
            <PulseStat value={String(openReminders)} label="Promemoria" />
            <PulseStat value={String(dashboard.memories.length)} label="Recall" />
            <PulseStat value={String(dashboard.sites.length)} label="Spazi" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attività recenti</Text>
            <Text style={styles.sectionLink}>LIVE</Text>
          </View>

          <View style={styles.card}>
            {recentItems.length ? recentItems.slice(0, 5).map((item) => <RecentActivity item={item} key={item.id} />) : (
              <View style={styles.empty}><Text style={styles.emptyTitle}>Nessuna attività ancora</Text><Text style={styles.emptyCopy}>Le azioni e le richieste a ONE compariranno qui.</Text></View>
            )}
          </View>

          <View style={styles.memoryCard}>
            <View style={styles.memoryIcon}>
              <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.memoryGradient}><View style={styles.memoryInner} /></LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memoryTitle}>La tua memoria privata</Text>
              <Text style={styles.memoryCopy}>{dashboard.memories.length ? `${dashboard.memories.length} elementi sincronizzati nel tuo Recall.` : 'ONE ricorda ciò che conta, così non devi farlo tu.'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavItem icon="home-outline" active />
          <NavItem icon="layers-outline" />
          <EnergyOrb
            state={orbState}
            size={64}
            compact
            onPress={() => setOrbState('activating')}
            accessibilityLabel="Attiva ONE"
          />
          <NavItem icon="search-outline" />
          <NavItem icon="person-outline" />
        </View>
      </SafeAreaView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable style={styles.quickAction} onPress={onPress}><Ionicons name={icon} size={18} color={colors.text} /><Text style={styles.quickActionText}>{label}</Text></Pressable>;
}

function NavItem({ icon, active = false }: { icon: keyof typeof Ionicons.glyphMap; active?: boolean }) {
  return <Pressable style={styles.navItem}><Ionicons name={icon} size={21} color={active ? colors.cyan : colors.textMuted} /></Pressable>;
}

function PulseStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.pulseStat}><Text style={styles.pulseValue}>{value}</Text><Text style={styles.pulseLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingTop: RNStatusBar.currentHeight ?? 0 },
  header: { height: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.text, fontSize: 18, letterSpacing: 7, paddingLeft: 7, fontWeight: '500' },
  avatar: { width: 40, height: 40 },
  avatarGradient: { flex: 1, borderRadius: 20, padding: 1.5 },
  avatarInner: { flex: 1, backgroundColor: '#0B0F16', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20 },
  heroCopy: { alignItems: 'center', marginTop: 30 },
  greeting: { color: colors.text, fontSize: 26, fontWeight: '400' },
  tagline: { color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 9 },
  askBar: { height: 58, marginTop: 28, paddingLeft: 12, paddingRight: 8, borderRadius: 29, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  spark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingHorizontal: 8 },
  micButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  micButtonRecording: { borderColor: 'rgba(70,227,183,0.5)', backgroundColor: 'rgba(70,227,183,0.08)' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickAction: { flex: 1, minHeight: 61, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5 },
  quickActionText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '500' },
  pulseRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  pulseStat: { flex: 1, minHeight: 66, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pulseValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  pulseLabel: { marginTop: 3, color: colors.textMuted, fontSize: 10.5 },
  sectionHeader: { marginTop: 26, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sectionLink: { color: colors.green, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  card: { paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  empty: { minHeight: 96, alignItems: 'center', justifyContent: 'center', padding: 16 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  emptyCopy: { color: colors.textMuted, fontSize: 12, marginTop: 5, textAlign: 'center' },
  memoryCard: { marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  memoryIcon: { width: 48, height: 48 },
  memoryGradient: { flex: 1, padding: 3, borderRadius: 24 },
  memoryInner: { flex: 1, borderRadius: 21, backgroundColor: '#080C12' },
  memoryTitle: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  memoryCopy: { marginTop: 4, color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  bottomNav: { position: 'absolute', bottom: 14, left: 20, right: 20, height: 70, borderRadius: 35, backgroundColor: 'rgba(12,16,23,0.94)', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'visible', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  navItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
