import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../theme/colors';
import { useOneAuth } from './auth';
import type { NativeDashboard, OneReminder } from './oneData';
import { setReminderCompleted } from './oneData';
import {
  loadNotificationPreferences,
  OneNotificationPreferences,
  setBriefingEnabled,
  setNotificationsEnabled,
} from './notifications';

export type NativeSection = 'home' | 'spaces' | 'recall' | 'reminders' | 'account';

const PRIVACY_URL = 'https://andrea70031.github.io/one-app/privacy.html';
const TERMS_URL = 'https://andrea70031.github.io/one-app/terms.html';
const SUPPORT_URL = 'https://andrea70031.github.io/one-app/support.html';

const defaultNotificationPrefs: OneNotificationPreferences = {
  enabled: false,
  briefing: true,
  briefingHour: 8,
};

type SharedProps = {
  dashboard: NativeDashboard;
  refreshing: boolean;
  onRefresh: () => Promise<void> | void;
};

type AccountProps = SharedProps & {
  fullName: string | null;
  email: string | null;
  onOpenReminders: () => void;
  onSignOut: () => void;
};

type ReminderProps = SharedProps & {
  userId: string;
  onChanged: () => Promise<void> | void;
};

function ScreenFrame({ children, refreshing, onRefresh }: SharedProps & { children: React.ReactNode }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
    >
      {children}
      <View style={{ height: 112 }} />
    </ScrollView>
  );
}

function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6F7786"
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={23} color={colors.cyan} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

export function NativeSpacesScreen(props: SharedProps) {
  const [query, setQuery] = useState('');
  const sites = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return props.dashboard.sites;
    return props.dashboard.sites.filter((site) =>
      [site.job_number, site.name, site.client || '', site.status].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [props.dashboard.sites, query]);

  const averageProgress = Math.round(
    props.dashboard.sites.reduce((sum, site) => sum + (Number(site.progress) || 0), 0) /
      Math.max(props.dashboard.sites.length, 1),
  );

  return (
    <ScreenFrame {...props}>
      <ScreenTitle eyebrow="SPAZI" title="I tuoi spazi di lavoro" subtitle="Cantieri, commesse e progetti restano separati ma accessibili a ONE." />
      <SearchBox value={query} onChangeText={setQuery} placeholder="Cerca commessa, cliente o nome…" />

      <View style={styles.summaryRow}>
        <SummaryMetric value={String(props.dashboard.sites.length)} label="Totali" />
        <SummaryMetric value={String(props.dashboard.sites.filter((site) => site.status.toLowerCase() !== 'chiuso').length)} label="Attivi" />
        <SummaryMetric value={`${averageProgress}%`} label="Media" />
      </View>

      <View style={styles.listBlock}>
        {sites.length ? sites.map((site) => {
          const progress = Math.max(0, Math.min(100, Number(site.progress) || 0));
          return (
            <Pressable
              key={site.id}
              style={({ pressed }) => [styles.siteCard, pressed && styles.pressed]}
              onPress={() => Alert.alert(
                `${site.job_number} · ${site.name}`,
                `${site.client ? `${site.client}\n` : ''}Stato: ${site.status}\nAvanzamento: ${progress}%`,
              )}
            >
              <View style={styles.siteTopRow}>
                <View style={styles.siteIcon}><Ionicons name="layers-outline" size={20} color={colors.cyan} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteJob}>{site.job_number}</Text>
                  <Text style={styles.siteName} numberOfLines={1}>{site.name}</Text>
                  <Text style={styles.siteClient} numberOfLines={1}>{site.client || 'Nessun cliente indicato'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
              <View style={styles.siteMetaRow}>
                <Text style={styles.metaText}>{site.status}</Text>
                <Text style={styles.metaAccent}>{progress}%</Text>
              </View>
            </Pressable>
          );
        }) : <EmptyState icon="layers-outline" title="Nessuno spazio trovato" copy={query ? 'Prova con un altro termine di ricerca.' : 'Quando creerai il primo spazio con ONE comparirà qui.'} />}
      </View>
    </ScreenFrame>
  );
}

export function NativeRecallScreen(props: SharedProps & { onOpenReminders: () => void }) {
  const [query, setQuery] = useState('');
  const memories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return props.dashboard.memories;
    return props.dashboard.memories.filter((memory) =>
      [memory.title, memory.summary || '', memory.kind].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [props.dashboard.memories, query]);

  const openReminders = props.dashboard.reminders.filter((item) => !item.completed).length;

  return (
    <ScreenFrame {...props}>
      <ScreenTitle eyebrow="RECALL" title="La memoria privata di ONE" subtitle="Cerca ciò che ONE ha salvato per te e recupera subito il contesto che serve." />
      <SearchBox value={query} onChangeText={setQuery} placeholder="Cerca nella tua memoria…" />

      <Pressable style={styles.linkCard} onPress={props.onOpenReminders}>
        <View style={styles.linkIcon}><Ionicons name="checkmark-done-outline" size={20} color={colors.green} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.linkTitle}>Promemoria</Text>
          <Text style={styles.linkCopy}>{openReminders} ancora aperti</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.listBlock}>
        {memories.length ? memories.map((memory) => (
          <View key={memory.id} style={styles.memoryRow}>
            <LinearGradient colors={[colors.cyan, colors.blue, colors.violet]} style={styles.memoryDotOuter}>
              <View style={styles.memoryDotInner} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{memory.title}</Text>
              {memory.summary ? <Text style={styles.rowCopy} numberOfLines={3}>{memory.summary}</Text> : null}
              <View style={styles.rowMetaLine}>
                <Text style={styles.metaText}>{memory.kind || 'memory'}</Text>
                <Text style={styles.metaText}>{formatDate(memory.created_at)}</Text>
              </View>
            </View>
          </View>
        )) : <EmptyState icon="sparkles-outline" title="Recall vuoto" copy={query ? 'Nessun ricordo corrisponde alla ricerca.' : 'Quando salverai qualcosa in Recall lo troverai qui.'} />}
      </View>
    </ScreenFrame>
  );
}

export function NativeRemindersScreen(props: ReminderProps) {
  const [mode, setMode] = useState<'open' | 'done'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const reminders = useMemo(
    () => props.dashboard.reminders.filter((item) => mode === 'open' ? !item.completed : item.completed),
    [mode, props.dashboard.reminders],
  );

  const toggle = async (reminder: OneReminder) => {
    if (busyId) return;
    setBusyId(reminder.id);
    try {
      await setReminderCompleted(props.userId, reminder.id, !reminder.completed);
      await props.onChanged();
    } catch (error) {
      Alert.alert('Promemoria', error instanceof Error ? error.message : 'Non riesco ad aggiornare questo promemoria.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenFrame {...props}>
      <ScreenTitle eyebrow="PROMEMORIA" title="Cose da non perdere" subtitle="ONE tiene insieme attività personali e operative senza mescolarle con la chat." />

      <View style={styles.segmented}>
        <Segment label={`Aperti ${props.dashboard.reminders.filter((item) => !item.completed).length}`} active={mode === 'open'} onPress={() => setMode('open')} />
        <Segment label={`Completati ${props.dashboard.reminders.filter((item) => item.completed).length}`} active={mode === 'done'} onPress={() => setMode('done')} />
      </View>

      <View style={styles.listBlock}>
        {reminders.length ? reminders.map((reminder) => (
          <Pressable key={reminder.id} style={({ pressed }) => [styles.reminderRow, pressed && styles.pressed]} onPress={() => toggle(reminder)}>
            <View style={[styles.checkCircle, reminder.completed && styles.checkCircleDone]}>
              {busyId === reminder.id ? <Text style={styles.checkBusy}>…</Text> : reminder.completed ? <Ionicons name="checkmark" size={15} color={colors.background} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, reminder.completed && styles.completedText]}>{reminder.title}</Text>
              {reminder.note ? <Text style={styles.rowCopy} numberOfLines={2}>{reminder.note}</Text> : null}
              <Text style={[styles.metaText, reminder.due_at && isOverdue(reminder.due_at) && !reminder.completed ? styles.overdue : null]}>
                {reminder.due_at ? `Scadenza ${formatDue(reminder.due_at)}` : 'Senza scadenza'}
              </Text>
            </View>
          </Pressable>
        )) : <EmptyState icon={mode === 'open' ? 'checkmark-circle-outline' : 'archive-outline'} title={mode === 'open' ? 'Tutto sotto controllo' : 'Nessun completato'} copy={mode === 'open' ? 'Non ci sono promemoria aperti.' : 'I promemoria completati compariranno qui.'} />}
      </View>
    </ScreenFrame>
  );
}

export function NativeAccountScreen(props: AccountProps) {
  const { deleteAccount } = useOneAuth();
  const [notificationPrefs, setNotificationPrefs] = useState<OneNotificationPreferences>(defaultNotificationPrefs);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const openReminders = props.dashboard.reminders.filter((item) => !item.completed).length;
  const name = props.fullName?.trim() || 'Account ONE';

  useEffect(() => {
    loadNotificationPreferences().then(setNotificationPrefs).catch(() => undefined);
  }, []);

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('ONE', 'Non riesco ad aprire questa pagina.');
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const next = await setNotificationsEnabled(enabled, props.dashboard.reminders);
      setNotificationPrefs(next);
      if (enabled && !next.enabled) {
        Alert.alert('Notifiche non abilitate', 'Puoi abilitarle in Impostazioni iOS → ONE → Notifiche.');
      }
    } finally {
      setNotificationBusy(false);
    }
  };

  const toggleBriefing = async (enabled: boolean) => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const next = await setBriefingEnabled(enabled, props.dashboard.reminders);
      setNotificationPrefs(next);
      if (enabled && !next.briefing) {
        Alert.alert('Briefing non attivato', 'Abilita prima le notifiche di ONE nelle impostazioni del dispositivo.');
      }
    } finally {
      setNotificationBusy(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      'Elimina account',
      'Questa operazione elimina definitivamente il tuo account ONE, Recall, promemoria e dati personali. Gli Spazi condivisi possono essere trasferiti a un altro membro.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Conferma definitiva',
            'L’eliminazione non può essere annullata. Vuoi eliminare definitivamente il tuo account?',
            [
              { text: 'Annulla', style: 'cancel' },
              {
                text: 'Elimina definitivamente',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                  } catch (error) {
                    setDeleting(false);
                    Alert.alert('Eliminazione account', error instanceof Error ? error.message : 'Operazione non completata.');
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  };

  return (
    <ScreenFrame {...props}>
      <ScreenTitle eyebrow="ACCOUNT" title="Il tuo spazio personale" subtitle="Profilo, notifiche, privacy e controlli del tuo account ONE." />

      <View style={styles.profileCard}>
        <LinearGradient colors={[colors.cyan, colors.violet, colors.pink]} style={styles.profileAvatarGradient}>
          <View style={styles.profileAvatarInner}><Ionicons name="person-outline" size={28} color={colors.text} /></View>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{props.email || 'Email non disponibile'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryMetric value={String(openReminders)} label="Aperti" />
        <SummaryMetric value={String(props.dashboard.memories.length)} label="Recall" />
        <SummaryMetric value={String(props.dashboard.sites.length)} label="Spazi" />
      </View>

      <Text style={styles.groupLabel}>NOTIFICHE</Text>
      <View style={styles.settingsCard}>
        <ToggleRow
          icon="notifications-outline"
          title="Notifiche ONE"
          copy="Scadenze e promemoria sul dispositivo"
          value={notificationPrefs.enabled}
          disabled={notificationBusy}
          onValueChange={toggleNotifications}
        />
        <ToggleRow
          icon="sunny-outline"
          title="Briefing giornaliero"
          copy={`Riepilogo ogni mattina alle ${String(notificationPrefs.briefingHour).padStart(2, '0')}:00`}
          value={notificationPrefs.enabled && notificationPrefs.briefing}
          disabled={notificationBusy}
          onValueChange={toggleBriefing}
        />
      </View>

      <Text style={styles.groupLabel}>ONE</Text>
      <View style={styles.settingsCard}>
        <SettingsRow icon="checkmark-done-outline" title="Promemoria" copy={`${openReminders} da completare`} onPress={props.onOpenReminders} />
        <SettingsRow icon="cloud-done-outline" title="Sincronizza adesso" copy="Aggiorna dati e attività" onPress={props.onRefresh} />
        <SettingsRow icon="help-circle-outline" title="Supporto" copy="Guida e segnalazione problemi" onPress={() => openUrl(SUPPORT_URL)} />
      </View>

      <Text style={styles.groupLabel}>PRIVACY E TERMINI</Text>
      <View style={styles.settingsCard}>
        <SettingsRow icon="shield-checkmark-outline" title="Privacy" copy="Come ONE tratta i dati" onPress={() => openUrl(PRIVACY_URL)} />
        <SettingsRow icon="document-text-outline" title="Termini di utilizzo" copy="Regole e condizioni del servizio" onPress={() => openUrl(TERMS_URL)} />
      </View>

      <Pressable style={styles.signOutButton} onPress={props.onSignOut}>
        <Ionicons name="log-out-outline" size={19} color="#FF8D9C" />
        <Text style={styles.signOutText}>Esci dall’account</Text>
      </Pressable>

      <Pressable disabled={deleting} style={[styles.deleteAccountButton, deleting && styles.disabled]} onPress={confirmDeleteAccount}>
        <Ionicons name="trash-outline" size={18} color="#FF6578" />
        <Text style={styles.deleteAccountText}>{deleting ? 'Eliminazione in corso…' : 'Elimina account definitivamente'}</Text>
      </Pressable>
    </ScreenFrame>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return <View style={styles.summaryMetric}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>;
}

function SettingsRow({ icon, title, copy, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; onPress: () => void | Promise<void> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
      <View style={styles.settingsIcon}><Ionicons name={icon} size={19} color={colors.cyan} /></View>
      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowCopy}>{copy}</Text></View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function ToggleRow({ icon, title, copy, value, disabled, onValueChange }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  copy: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void | Promise<void>;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}><Ionicons name={icon} size={19} color={colors.cyan} /></View>
      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowCopy}>{copy}</Text></View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(66,232,224,0.36)' }}
        thumbColor={value ? colors.cyan : '#A1A8B4'}
      />
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'non valida';
  return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 20, paddingTop: 18 },
  titleBlock: { marginBottom: 18 },
  eyebrow: { color: colors.cyan, fontSize: 10, letterSpacing: 1.7, fontWeight: '800' },
  title: { color: colors.text, fontSize: 27, lineHeight: 34, fontWeight: '600', marginTop: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 360 },
  searchBox: { height: 50, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  summaryMetric: { flex: 1, minHeight: 68, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: colors.textMuted, fontSize: 10.5, marginTop: 3 },
  listBlock: { marginTop: 16, gap: 10 },
  siteCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 15 },
  siteTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(66,232,224,0.09)' },
  siteJob: { color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  siteName: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  siteClient: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  progressTrack: { height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.cyan },
  siteMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { color: colors.textMuted, fontSize: 10.5 },
  metaAccent: { color: colors.cyan, fontSize: 10.5, fontWeight: '700' },
  linkCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(70,227,183,0.10)', alignItems: 'center', justifyContent: 'center' },
  linkTitle: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  linkCopy: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  memoryRow: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, flexDirection: 'row', gap: 12 },
  memoryDotOuter: { width: 36, height: 36, borderRadius: 18, padding: 2 },
  memoryDotInner: { flex: 1, borderRadius: 16, backgroundColor: '#080C12' },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  rowMetaLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  segmented: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: 'rgba(66,232,224,0.11)', borderWidth: 1, borderColor: 'rgba(66,232,224,0.22)' },
  segmentText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600' },
  segmentTextActive: { color: colors.cyan },
  reminderRow: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkCircleDone: { backgroundColor: colors.green, borderColor: colors.green },
  checkBusy: { color: colors.cyan, fontSize: 12, fontWeight: '800' },
  completedText: { color: colors.textMuted, textDecorationLine: 'line-through' },
  overdue: { color: '#FF8D9C' },
  profileCard: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  profileAvatarGradient: { width: 62, height: 62, borderRadius: 31, padding: 2 },
  profileAvatarInner: { flex: 1, borderRadius: 29, backgroundColor: '#080C12', alignItems: 'center', justifyContent: 'center' },
  profileName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  profileEmail: { color: colors.textMuted, fontSize: 12.5, marginTop: 4 },
  groupLabel: { marginTop: 22, marginBottom: 8, marginLeft: 3, color: colors.textMuted, fontSize: 9.5, letterSpacing: 1.3, fontWeight: '800' },
  settingsCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  settingsRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  settingsIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(66,232,224,0.08)', alignItems: 'center', justifyContent: 'center' },
  signOutButton: { marginTop: 22, minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,141,156,0.22)', backgroundColor: 'rgba(255,141,156,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  signOutText: { color: '#FF8D9C', fontSize: 13.5, fontWeight: '600' },
  deleteAccountButton: { marginTop: 10, minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,101,120,0.28)', backgroundColor: 'rgba(255,101,120,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  deleteAccountText: { color: '#FF6578', fontSize: 12.5, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  emptyState: { minHeight: 170, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(66,232,224,0.08)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptyCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  pressed: { opacity: 0.72 },
});
