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
import {
  NativeAccountScreen,
  NativeRecallScreen,
  NativeRemindersScreen,
  NativeSection,
  NativeSpacesScreen,
} from './NativeSections';

const stateSequence: OrbState[] = ['idle', 'activating', 'listening', 'thinking', 'done'];
const emptyDashboard: NativeDashboard = { activities: [], reminders: [], memories: [], sites: [] };
const MAX_IMAGES = 6;

function captureId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NativeHome() {
  const { user, profile, signOut } = useOneAuth();
  const [section, setSection] = useState<NativeSection>('home');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [input, setInput] = useState('');
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dashboard, setDashboard] = useState<NativeDashboard>(emptyDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [aiResult, setAiResult] = useState<OneAIResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const index = useMemo(() => stateSequence.indexOf(orbState), [orbState]);
  const recentItems = useMemo(() => dashboardRecentItems(dashboard), [dashboard]);
  const openReminders = useMemo(() => dashboard.reminders.filter((item) => !item.completed).length, [dashboard.reminders]);
  const imageCount = useMemo(() => captures.filter((item) => item.kind === 'camera' || item.kind === 'photo').length, [captures]);
  const hasDraft = Boolean(input.trim() || captures.length);

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

  const addCaptures = (items: CaptureItem[]) => {
    setCaptures((current) => {
      let next = [...current];
      for (const item of items) {
        if (item.kind === 'camera' || item.kind === 'photo') {
          const count = next.filter((entry) => entry.kind === 'camera' || entry.kind === 'photo').length;
          if (count < MAX_IMAGES) next.push(item);
          continue;
        }
        if (item.kind === 'document') next = [...next.filter((entry) => entry.kind !== 'document'), item];
        if (item.kind === 'audio') next = [...next.filter((entry) => entry.kind !== 'audio'), item];
      }
      return next;
    });
    setOrbState('done');
  };

  const removeCapture = (id: string) => {
    setCaptures((current) => current.filter((item) => item.id !== id));
  };

  const takePhoto = async () => {
    if (imageCount >= MAX_IMAGES) return Alert.alert('Limite immagini', `ONE può analizzare fino a ${MAX_IMAGES} immagini nella stessa richiesta.`);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Fotocamera non disponibile', 'Consenti a ONE di usare la fotocamera nelle impostazioni.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.78, base64: true, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      addCaptures([{
        id: captureId('camera'),
        kind: 'camera',
        uri: asset.uri,
        name: asset.fileName ?? 'Foto scattata.jpg',
        detail: 'Foto pronta per l’analisi AI',
        mimeType: asset.base64 ? 'image/jpeg' : asset.mimeType ?? 'image/jpeg',
        base64: asset.base64 ?? undefined,
        size: asset.fileSize ?? undefined,
      }]);
    }
  };

  const pickPhoto = async () => {
    const remaining = MAX_IMAGES - imageCount;
    if (remaining <= 0) return Alert.alert('Limite immagini', `Rimuovi una foto prima di aggiungerne altre. Il limite è ${MAX_IMAGES}.`);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Foto non disponibili', 'Consenti a ONE di accedere alle foto nelle impostazioni.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.78,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      const items: CaptureItem[] = result.assets.map((asset, position) => ({
        id: captureId(`photo-${position}`),
        kind: 'photo',
        uri: asset.uri,
        name: asset.fileName ?? `Immagine ${position + 1}.jpg`,
        detail: 'Foto pronta per l’analisi AI',
        mimeType: asset.base64 ? 'image/jpeg' : asset.mimeType ?? 'image/jpeg',
        base64: asset.base64 ?? undefined,
        size: asset.fileSize ?? undefined,
      }));
      if (items.length) addCaptures(items);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      addCaptures([{
        id: captureId('document'),
        kind: 'document',
        uri: asset.uri,
        name: asset.name,
        detail: asset.mimeType ? `${asset.mimeType} · pronto per ONE` : 'Documento pronto per ONE',
        mimeType: asset.mimeType ?? undefined,
        size: asset.size ?? undefined,
      }]);
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
        if (!recorder.uri) throw new Error('Audio non disponibile');
        addCaptures([{
          id: captureId('audio'),
          kind: 'audio',
          uri: recorder.uri,
          name: 'Registrazione vocale.m4a',
          detail: 'ONE la trascriverà prima di rispondere',
          mimeType: 'audio/mp4',
        }]);
      }
    } catch {
      setIsRecording(false);
      setOrbState('idle');
      Alert.alert('Registrazione non riuscita', 'Riprova tra qualche secondo.');
    }
  };

  const submitRequest = async () => {
    const text = input.trim();
    if ((!text && !captures.length) || submitting || !user) {
      if (!text && !captures.length) setOrbState('activating');
      return;
    }

    setSubmitting(true);
    setOrbState('thinking');
    setAiResult(null);
    try {
      const result = await askOneNative({ text, attachments: captures });
      setAiResult(result);
      setInput('');
      setCaptures([]);
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

  const openOne = () => {
    setSection('home');
    setOrbState('activating');
  };

  const composerAction = isRecording ? toggleRecording : hasDraft ? submitRequest : toggleRecording;
  const composerIcon: keyof typeof Ionicons.glyphMap = isRecording ? 'stop' : hasDraft ? 'arrow-up' : 'mic-outline';

  const sharedScreenProps = {
    dashboard,
    refreshing,
    onRefresh: () => refreshDashboard(false),
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#07101B', colors.background, '#040509']} locations={[0, 0.34, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => section === 'home' ? setSection('reminders') : setSection('home')}
          >
            <Ionicons name={section === 'home' ? 'menu-outline' : 'arrow-back-outline'} size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.brand}>O N E</Text>
          <Pressable style={styles.avatar} onPress={() => setSection('account')}>
            <LinearGradient colors={[colors.cyan, colors.violet, colors.pink]} style={styles.avatarGradient}>
              <View style={styles.avatarInner}><Ionicons name="person-outline" size={18} color={colors.text} /></View>
            </LinearGradient>
          </Pressable>
        </View>

        {section === 'home' ? (
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
                onSubmitEditing={submitRequest}
                placeholder={submitting ? 'ONE sta analizzando…' : captures.length ? 'Aggiungi una richiesta (opzionale)…' : 'Chiedi qualsiasi cosa…'}
                placeholderTextColor="#6F7786"
                style={styles.input}
                returnKeyType="send"
                editable={!submitting}
              />
              <Pressable
                onPress={composerAction}
                disabled={submitting}
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                  hasDraft && !isRecording && styles.sendButton,
                  submitting && styles.composerButtonDisabled,
                ]}
              >
                <Ionicons
                  name={submitting ? 'sparkles-outline' : composerIcon}
                  size={19}
                  color={isRecording ? colors.green : hasDraft ? colors.cyan : colors.text}
                />
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <QuickAction icon="camera-outline" label="Mostra" onPress={takePhoto} />
              <QuickAction icon="document-outline" label="Documento" onPress={pickDocument} />
              <QuickAction icon="image-outline" label="Foto" onPress={pickPhoto} />
              <QuickAction icon={isRecording ? 'stop-circle-outline' : 'mic-outline'} label={isRecording ? 'Stop' : 'Parla'} onPress={toggleRecording} />
            </View>

            {captures.length > 0 && (
              <View style={styles.attachmentsBlock}>
                <View style={styles.attachmentsHeader}>
                  <Text style={styles.attachmentsTitle}>Allegati per ONE</Text>
                  <Text style={styles.attachmentsCount}>{captures.length}</Text>
                </View>
                {captures.map((item) => (
                  <CapturePreview key={item.id} item={item} onRemove={() => removeCapture(item.id)} />
                ))}
              </View>
            )}

            {aiResult && user && <NativeAIResponseCard result={aiResult} userId={user.id} onChanged={() => refreshDashboard(true)} />}

            <View style={styles.pulseRow}>
              <PulseStat value={String(openReminders)} label="Promemoria" onPress={() => setSection('reminders')} />
              <PulseStat value={String(dashboard.memories.length)} label="Recall" onPress={() => setSection('recall')} />
              <PulseStat value={String(dashboard.sites.length)} label="Spazi" onPress={() => setSection('spaces')} />
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

            <Pressable style={styles.memoryCard} onPress={() => setSection('recall')}>
              <View style={styles.memoryIcon}>
                <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.memoryGradient}><View style={styles.memoryInner} /></LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memoryTitle}>La tua memoria privata</Text>
                <Text style={styles.memoryCopy}>{dashboard.memories.length ? `${dashboard.memories.length} elementi sincronizzati nel tuo Recall.` : 'ONE ricorda ciò che conta, così non devi farlo tu.'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            <View style={{ height: 110 }} />
          </ScrollView>
        ) : section === 'spaces' ? (
          <NativeSpacesScreen {...sharedScreenProps} />
        ) : section === 'recall' ? (
          <NativeRecallScreen {...sharedScreenProps} onOpenReminders={() => setSection('reminders')} />
        ) : section === 'reminders' && user ? (
          <NativeRemindersScreen
            {...sharedScreenProps}
            userId={user.id}
            onChanged={() => refreshDashboard(true)}
          />
        ) : (
          <NativeAccountScreen
            {...sharedScreenProps}
            fullName={profile?.full_name ?? null}
            email={user?.email ?? profile?.email ?? null}
            onOpenReminders={() => setSection('reminders')}
            onSignOut={confirmSignOut}
          />
        )}

        <View style={styles.bottomNav}>
          <NavItem icon="home-outline" label="Home" active={section === 'home'} onPress={() => setSection('home')} />
          <NavItem icon="layers-outline" label="Spazi" active={section === 'spaces'} onPress={() => setSection('spaces')} />
          <EnergyOrb
            state={orbState}
            size={64}
            compact
            onPress={openOne}
            accessibilityLabel="Attiva ONE"
          />
          <NavItem icon="search-outline" label="Recall" active={section === 'recall' || section === 'reminders'} onPress={() => setSection('recall')} />
          <NavItem icon="person-outline" label="Account" active={section === 'account'} onPress={() => setSection('account')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable style={styles.quickAction} onPress={onPress}><Ionicons name={icon} size={18} color={colors.text} /><Text style={styles.quickActionText}>{label}</Text></Pressable>;
}

function NavItem({ icon, label, active = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.navItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={21} color={active ? colors.cyan : colors.textMuted} />
    </Pressable>
  );
}

function PulseStat({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.pulseStat, pressed && styles.pulsePressed]} onPress={onPress}>
      <Text style={styles.pulseValue}>{value}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </Pressable>
  );
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
  sendButton: { borderColor: 'rgba(66,232,224,0.46)', backgroundColor: 'rgba(66,232,224,0.09)' },
  composerButtonDisabled: { opacity: 0.55 },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickAction: { flex: 1, minHeight: 61, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5 },
  quickActionText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '500' },
  attachmentsBlock: { marginTop: 14 },
  attachmentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  attachmentsTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  attachmentsCount: { color: colors.cyan, fontSize: 11, fontWeight: '700' },
  pulseRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  pulseStat: { flex: 1, minHeight: 66, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pulsePressed: { opacity: 0.72 },
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
