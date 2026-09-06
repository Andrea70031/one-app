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
import { deleteOneMemory, deleteOneSite, OneMemory, OneSite } from './oneData';
import { supabase } from './supabase';

type Mode = 'sites' | 'notes';

type Props = {
  onChanged: () => void;
};

export function NativeDeletionManager({ onChanged }: Props) {
  const { user } = useOneAuth();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('sites');
  const [sites, setSites] = useState<OneSite[]>([]);
  const [notes, setNotes] = useState<OneMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [siteResult, noteResult] = await Promise.all([
        supabase.from('sites').select('id,job_number,name,client,status,progress').order('updated_at', { ascending: false }).limit(100),
        supabase.from('one_memories').select('id,title,summary,kind,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(120),
      ]);
      const firstError = siteResult.error || noteResult.error;
      if (firstError) throw firstError;
      setSites((siteResult.data || []) as OneSite[]);
      setNotes((noteResult.data || []) as OneMemory[]);
    } catch (error) {
      Alert.alert('Gestione ONE', error instanceof Error ? error.message : 'Non riesco a caricare gli elementi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void load();
  }, [visible, user?.id]);

  const count = useMemo(() => mode === 'sites' ? sites.length : notes.length, [mode, notes.length, sites.length]);

  const removeSite = (site: OneSite) => {
    Alert.alert(
      'Elimina cantiere',
      `Vuoi eliminare definitivamente ${site.job_number} · ${site.name}?\n\nVerranno eliminati anche problemi, attività, report, promemoria e note collegati al cantiere.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Conferma definitiva',
            'Questa operazione non può essere annullata.',
            [
              { text: 'Annulla', style: 'cancel' },
              {
                text: 'Elimina definitivamente',
                style: 'destructive',
                onPress: async () => {
                  setBusyId(site.id);
                  try {
                    await deleteOneSite(site.id);
                    setSites((current) => current.filter((item) => item.id !== site.id));
                    onChanged();
                  } catch (error) {
                    Alert.alert('Eliminazione cantiere', error instanceof Error ? error.message : 'Operazione non riuscita.');
                  } finally {
                    setBusyId(null);
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  };

  const removeNote = (note: OneMemory) => {
    if (!user) return;
    Alert.alert(
      'Elimina nota',
      `Vuoi eliminare definitivamente “${note.title}”?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setBusyId(note.id);
            try {
              await deleteOneMemory(user.id, note.id);
              setNotes((current) => current.filter((item) => item.id !== note.id));
              onChanged();
            } catch (error) {
              Alert.alert('Eliminazione nota', error instanceof Error ? error.message : 'Operazione non riuscita.');
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
        accessibilityLabel="Gestisci ed elimina cantieri o note"
        style={({ pressed }) => [styles.floatingButton, pressed && styles.pressed]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="trash-outline" size={18} color="#FF8D9C" />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>GESTISCI</Text>
                <Text style={styles.title}>Elimina elementi</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.segmented}>
              <Segment label={`Cantieri ${sites.length}`} active={mode === 'sites'} onPress={() => setMode('sites')} />
              <Segment label={`Note ${notes.length}`} active={mode === 'notes'} onPress={() => setMode('notes')} />
            </View>

            <Text style={styles.explainer}>
              {mode === 'sites'
                ? 'L’eliminazione di un cantiere rimuove anche i dati collegati. Può farlo solo chi ha i permessi di gestione.'
                : 'Le note vengono eliminate dal tuo Recall cloud in modo definitivo.'}
            </Text>

            {loading ? (
              <View style={styles.loading}><ActivityIndicator color={colors.cyan} /><Text style={styles.loadingText}>Caricamento…</Text></View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {count === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name={mode === 'sites' ? 'layers-outline' : 'document-text-outline'} size={24} color={colors.cyan} />
                    <Text style={styles.emptyTitle}>{mode === 'sites' ? 'Nessun cantiere' : 'Nessuna nota'}</Text>
                    <Text style={styles.emptyCopy}>Non c’è nulla da eliminare in questa sezione.</Text>
                  </View>
                ) : mode === 'sites' ? sites.map((site) => (
                  <View key={site.id} style={styles.row}>
                    <View style={styles.rowIcon}><Ionicons name="layers-outline" size={18} color={colors.cyan} /></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{site.job_number} · {site.name}</Text>
                      <Text style={styles.rowMeta}>{site.client || site.status}</Text>
                    </View>
                    <Pressable disabled={busyId === site.id} style={styles.deleteButton} onPress={() => removeSite(site)}>
                      {busyId === site.id ? <ActivityIndicator size="small" color="#FF8D9C" /> : <Ionicons name="trash-outline" size={18} color="#FF8D9C" />}
                    </Pressable>
                  </View>
                )) : notes.map((note) => (
                  <View key={note.id} style={styles.row}>
                    <View style={styles.rowIcon}><Ionicons name="document-text-outline" size={18} color={colors.violet} /></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{note.title}</Text>
                      <Text style={styles.rowMeta} numberOfLines={2}>{note.summary || note.kind}</Text>
                    </View>
                    <Pressable disabled={busyId === note.id} style={styles.deleteButton} onPress={() => removeNote(note)}>
                      {busyId === note.id ? <ActivityIndicator size="small" color="#FF8D9C" /> : <Ionicons name="trash-outline" size={18} color="#FF8D9C" />}
                    </Pressable>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
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
    maxHeight: '82%',
    minHeight: '58%',
    backgroundColor: '#090D14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: 4, color: colors.text, fontSize: 24, fontWeight: '600' },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmented: { marginTop: 18, flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: 'rgba(66,232,224,0.10)', borderWidth: 1, borderColor: 'rgba(66,232,224,0.22)' },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: colors.cyan },
  explainer: { marginTop: 12, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  loading: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: colors.textMuted, fontSize: 12 },
  list: { paddingTop: 14 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  rowMeta: { marginTop: 4, color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  deleteButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,101,120,0.07)', borderWidth: 1, borderColor: 'rgba(255,101,120,0.20)' },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 12, color: colors.text, fontSize: 15, fontWeight: '600' },
  emptyCopy: { marginTop: 5, color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
