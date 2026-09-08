import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { useOneAuth } from './auth';
import {
  loadOneManageData,
  OneActivity,
  OneManageData,
  OneMemory,
  OneReminder,
  OneSite,
  permanentlyDeleteTrashItem,
  restoreTrashItem,
  softDeleteOneActivity,
  softDeleteOneMemory,
  softDeleteOneReminder,
  softDeleteOneSite,
  TrashItem,
} from './oneData';

type Mode = 'sites' | 'notes' | 'reminders' | 'activities' | 'trash';

type Props = {
  onChanged: () => void;
};

const emptyData: OneManageData = { sites: [], memories: [], reminders: [], activities: [], trash: [] };

export function NativeDeletionManager({ onChanged }: Props) {
  const { user } = useOneAuth();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('sites');
  const [data, setData] = useState<OneManageData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setData(await loadOneManageData(user.id));
    } catch (error) {
      Alert.alert('Gestione ONE', error instanceof Error ? error.message : 'Non riesco a caricare gli elementi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void load();
  }, [visible, user?.id]);

  const count = useMemo(() => {
    if (mode === 'sites') return data.sites.length;
    if (mode === 'notes') return data.memories.length;
    if (mode === 'reminders') return data.reminders.length;
    if (mode === 'activities') return data.activities.length;
    return data.trash.length;
  }, [data, mode]);

  const refreshAfterChange = async () => {
    await load();
    onChanged();
  };

  const moveToTrash = async (kind: Exclude<Mode, 'trash'>, item: OneSite | OneMemory | OneReminder | OneActivity) => {
    if (!user || busyId) return;
    setBusyId(item.id);
    try {
      if (kind === 'sites') await softDeleteOneSite(item.id);
      if (kind === 'notes') await softDeleteOneMemory(user.id, item.id);
      if (kind === 'reminders') await softDeleteOneReminder(user.id, item.id);
      if (kind === 'activities') await softDeleteOneActivity(user.id, item.id);
      await refreshAfterChange();
    } catch (error) {
      Alert.alert('ONE', error instanceof Error ? error.message : 'Operazione non riuscita.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmMoveToTrash = (kind: Exclude<Mode, 'trash'>, item: OneSite | OneMemory | OneReminder | OneActivity, label: string) => {
    const isSite = kind === 'sites';
    Alert.alert(
      isSite ? 'Sposta cantiere nel Cestino' : 'Sposta nel Cestino',
      isSite
        ? `${label}\n\nIl cantiere sparirà dalle liste. I dati collegati restano recuperabili insieme al cantiere fino all’eliminazione definitiva.`
        : `Vuoi rimuovere “${label}” dalle liste di ONE? Potrai ripristinarlo dal Cestino.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Sposta nel Cestino', style: 'destructive', onPress: () => void moveToTrash(kind, item) },
      ],
    );
  };

  const restore = async (item: TrashItem) => {
    if (!user || busyId) return;
    setBusyId(item.id);
    try {
      await restoreTrashItem(user.id, item);
      await refreshAfterChange();
    } catch (error) {
      Alert.alert('Ripristino', error instanceof Error ? error.message : 'Non riesco a ripristinare questo elemento.');
    } finally {
      setBusyId(null);
    }
  };

  const permanentDelete = (item: TrashItem) => {
    if (!user || busyId) return;
    Alert.alert(
      'Elimina definitivamente',
      item.kind === 'site'
        ? `Eliminare definitivamente “${item.title}”? Verranno rimossi anche i dati collegati al cantiere. Questa operazione non può essere annullata.`
        : `Eliminare definitivamente “${item.title}”? Questa operazione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina definitivamente',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await permanentlyDeleteTrashItem(user.id, item);
              await refreshAfterChange();
            } catch (error) {
              Alert.alert('Eliminazione definitiva', error instanceof Error ? error.message : 'Operazione non riuscita.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gestisci elementi e cestino"
        style={({ pressed }) => [styles.floatingButton, pressed && styles.pressed]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="trash-outline" size={18} color="#FF9AA7" />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>GESTISCI</Text>
                <Text style={styles.title}>Pulisci ONE</Text>
                <Text style={styles.headerCopy}>Tutto ciò che crei può essere rimosso e recuperato dal Cestino.</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modeGrid}>
              <ModeButton label={`Cantieri ${data.sites.length}`} icon="layers-outline" active={mode === 'sites'} onPress={() => setMode('sites')} />
              <ModeButton label={`Note ${data.memories.length}`} icon="document-text-outline" active={mode === 'notes'} onPress={() => setMode('notes')} />
              <ModeButton label={`Promemoria ${data.reminders.length}`} icon="alarm-outline" active={mode === 'reminders'} onPress={() => setMode('reminders')} />
              <ModeButton label={`Attività ${data.activities.length}`} icon="sparkles-outline" active={mode === 'activities'} onPress={() => setMode('activities')} />
              <ModeButton label={`Cestino ${data.trash.length}`} icon="trash-bin-outline" active={mode === 'trash'} onPress={() => setMode('trash')} wide />
            </View>

            <Text style={styles.explainer}>
              {mode === 'trash'
                ? 'Gli elementi restano recuperabili per 30 giorni. ONE elimina automaticamente quelli scaduti quando l’app viene utilizzata.'
                : 'Tocca il cestino accanto a un elemento per farlo sparire dalle liste senza perderlo subito.'}
            </Text>

            {loading ? (
              <View style={styles.loading}><ActivityIndicator color={colors.cyan} /><Text style={styles.loadingText}>Caricamento…</Text></View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {count === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name={mode === 'trash' ? 'checkmark-circle-outline' : 'sparkles-outline'} size={24} color={colors.cyan} />
                    <Text style={styles.emptyTitle}>{mode === 'trash' ? 'Cestino vuoto' : 'Nessun elemento'}</Text>
                    <Text style={styles.emptyCopy}>{mode === 'trash' ? 'Non hai nulla da recuperare o eliminare definitivamente.' : 'Non c’è nulla da rimuovere in questa sezione.'}</Text>
                  </View>
                ) : mode === 'sites' ? data.sites.map((site) => (
                  <ManageRow
                    key={site.id}
                    icon="layers-outline"
                    title={`${site.job_number} · ${site.name}`}
                    subtitle={site.client || site.status}
                    busy={busyId === site.id}
                    onDelete={() => confirmMoveToTrash('sites', site, `${site.job_number} · ${site.name}`)}
                  />
                )) : mode === 'notes' ? data.memories.map((note) => (
                  <ManageRow
                    key={note.id}
                    icon="document-text-outline"
                    title={note.title}
                    subtitle={note.summary || note.kind}
                    busy={busyId === note.id}
                    onDelete={() => confirmMoveToTrash('notes', note, note.title)}
                  />
                )) : mode === 'reminders' ? data.reminders.map((reminder) => (
                  <ManageRow
                    key={reminder.id}
                    icon="alarm-outline"
                    title={reminder.title}
                    subtitle={reminder.note || (reminder.due_at ? `Scadenza ${new Date(reminder.due_at).toLocaleDateString('it-IT')}` : 'Senza scadenza')}
                    busy={busyId === reminder.id}
                    onDelete={() => confirmMoveToTrash('reminders', reminder, reminder.title)}
                  />
                )) : mode === 'activities' ? data.activities.map((activity) => (
                  <ManageRow
                    key={activity.id}
                    icon="sparkles-outline"
                    title={activity.title}
                    subtitle={activity.detail || activity.type}
                    busy={busyId === activity.id}
                    onDelete={() => confirmMoveToTrash('activities', activity, activity.title)}
                  />
                )) : data.trash.map((item) => (
                  <TrashRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    busy={busyId === item.id}
                    onRestore={() => void restore(item)}
                    onDelete={() => permanentDelete(item)}
                  />
                ))}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ModeButton({ label, icon, active, onPress, wide = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, wide && styles.modeWide, active && styles.modeActive]}>
      <Ionicons name={icon} size={15} color={active ? colors.cyan : colors.textMuted} />
      <Text style={[styles.modeText, active && styles.modeTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function ManageRow({ icon, title, subtitle, busy, onDelete }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; busy: boolean; onDelete: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.cyan} /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowMeta} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Pressable disabled={busy} style={styles.deleteButton} onPress={onDelete}>
        {busy ? <ActivityIndicator size="small" color="#FF9AA7" /> : <Ionicons name="trash-outline" size={18} color="#FF9AA7" />}
      </Pressable>
    </View>
  );
}

function TrashRow({ item, busy, onRestore, onDelete }: { item: TrashItem; busy: boolean; onRestore: () => void; onDelete: () => void }) {
  const days = Math.max(0, 30 - Math.floor((Date.now() - new Date(item.deleted_at).getTime()) / 86_400_000));
  const icon: keyof typeof Ionicons.glyphMap = item.kind === 'site' ? 'layers-outline' : item.kind === 'memory' ? 'document-text-outline' : item.kind === 'reminder' ? 'alarm-outline' : 'sparkles-outline';
  return (
    <View style={styles.trashRow}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.violet} /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={2}>{item.subtitle}</Text>
        <Text style={styles.expiryText}>{days > 0 ? `${days} giorni al definitivo` : 'In scadenza'}</Text>
      </View>
      <View style={styles.trashActions}>
        <Pressable disabled={busy} accessibilityLabel="Ripristina" style={styles.restoreButton} onPress={onRestore}>
          {busy ? <ActivityIndicator size="small" color={colors.cyan} /> : <Ionicons name="arrow-undo-outline" size={17} color={colors.cyan} />}
        </Pressable>
        <Pressable disabled={busy} accessibilityLabel="Elimina definitivamente" style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-bin-outline" size={17} color="#FF9AA7" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    zIndex: 100,
    right: 18,
    bottom: 98,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(35,12,18,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,101,120,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: {
    maxHeight: '88%',
    minHeight: '66%',
    backgroundColor: '#090D14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: 4, color: colors.text, fontSize: 24, fontWeight: '600' },
  headerCopy: { marginTop: 5, color: colors.textMuted, fontSize: 11.5, lineHeight: 16, maxWidth: 275 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  modeButton: { width: '48.7%', minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeWide: { width: '100%' },
  modeActive: { backgroundColor: 'rgba(66,232,224,0.10)', borderColor: 'rgba(66,232,224,0.26)' },
  modeText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600' },
  modeTextActive: { color: colors.cyan },
  explainer: { marginTop: 12, color: colors.textMuted, fontSize: 11.5, lineHeight: 17 },
  loading: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: colors.textMuted, fontSize: 12 },
  list: { paddingTop: 12 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  trashRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  rowMeta: { marginTop: 4, color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  expiryText: { marginTop: 4, color: '#D39AFF', fontSize: 10.5, fontWeight: '600' },
  trashActions: { flexDirection: 'row', gap: 6 },
  restoreButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(66,232,224,0.07)', borderWidth: 1, borderColor: 'rgba(66,232,224,0.20)' },
  deleteButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,101,120,0.07)', borderWidth: 1, borderColor: 'rgba(255,101,120,0.20)' },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 12, color: colors.text, fontSize: 15, fontWeight: '600' },
  emptyCopy: { marginTop: 5, color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
