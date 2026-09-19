import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { OneAIResult } from '../native/oneAI';
import { canExecuteOneAction, executeCoordinatedAction } from '../native/oneActionCoordinator';
import { saveOneMemory } from '../native/oneData';
import { reviewFields, reviewValues, reviewedPayload } from '../native/actionReview';
import { colors } from '../theme/colors';

type Props = {
  result: OneAIResult;
  userId: string;
  onChanged?: () => void;
};

export function NativeAIResponseCard({ result, userId, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [executed, setExecuted] = useState<number[]>([]);
  const locked = useRef(false);

  const saveRecall = async () => {
    if (saved || locked.current) return;
    locked.current = true;
    setBusy('recall');
    try {
      await saveOneMemory(userId, {
        title: result.memory_title || 'Risposta ONE',
        summary: result.memory_summary || result.summary,
        kind: 'ai',
        payload: { summary: result.summary, intent: result.intent },
      });
      setSaved(true);
      onChanged?.();
    } catch (error) {
      Alert.alert('Recall', error instanceof Error ? error.message : 'Salvataggio non riuscito.');
    } finally {
      locked.current = false;
      setBusy(null);
    }
  };

  const run = (index: number) => {
    if (locked.current || executed.includes(index)) return;
    const source = result.actions[index];
    if (!source || !canExecuteOneAction(source)) return;
    setValues(reviewValues(source.payload || {}));
    setReviewIndex(index);
  };
  const confirm = async () => {
    if (locked.current || reviewIndex == null) return;
    const source = result.actions[reviewIndex];
    if (!source) return;
    locked.current = true;
    setBusy(`action-${reviewIndex}`);
    try {
      const outcome = await executeCoordinatedAction(userId, { ...source, payload: reviewedPayload(source.payload || {}, values) });
      Alert.alert(outcome.ok ? 'Operazione completata' : 'Azione non completata', outcome.message || 'Operazione completata.');
      if (outcome.ok) {
        setExecuted(current => [...current, reviewIndex]);
        setReviewIndex(null);
        onChanged?.();
      }
    } catch (error) {
      Alert.alert('Azione non riuscita', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally { locked.current = false; setBusy(null); }
  };
  const reviewing = reviewIndex == null ? null : result.actions[reviewIndex];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.badge}><Ionicons name="sparkles-outline" size={16} color={colors.cyan} /></View>
        <Text style={styles.label}>ONE</Text>
      </View>
      <Text selectable style={styles.summary}>{result.summary}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={saveRecall} disabled={Boolean(busy) || saved}>
          <Ionicons name={saved ? 'checkmark-outline' : 'bookmark-outline'} size={16} color={saved ? colors.green : colors.text} />
          <Text style={styles.secondaryText}>{saved ? 'Salvato in Recall' : 'Salva in Recall'}</Text>
        </Pressable>
        <Pressable style={styles.secondary} accessibilityRole="button" onPress={() => { void Share.share({ message: result.summary }).catch(() => Alert.alert('ONE', 'Condivisione non disponibile.')); }}><Text style={styles.secondaryText}>Condividi risposta</Text></Pressable>
        {result.actions.map((action, index) => {
          if (!canExecuteOneAction(action)) return null;
          return (
            <Pressable key={`${action.label}-${index}`} style={styles.secondary} onPress={() => run(index)} disabled={Boolean(busy) || executed.includes(index)}>
              <Ionicons name="flash-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryText}>{executed.includes(index) ? 'Completata' : busy === `action-${index}` ? 'Attendi…' : action.label || 'Rivedi azione'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Modal visible={Boolean(reviewing)} animationType="slide" onRequestClose={() => { if (!locked.current) setReviewIndex(null); }}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background, paddingTop: 55 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
            <Text style={[styles.summary, { fontSize: 22, marginBottom: 16 }]}>{reviewing?.label || 'Rivedi azione'}</Text>
            <Text style={[styles.summary, { marginBottom: 16 }]}>Controlla i dati. L’operazione parte solo quando confermi.</Text>
            {reviewFields(String(reviewing?.kind ?? reviewing?.type ?? '')).map(field => <View key={field.key} style={{ marginBottom: 16 }}>
              <Text style={styles.secondaryText}>{field.label}</Text>
              <TextInput accessibilityLabel={field.label} value={String(values[field.key] ?? '')} onChangeText={value => setValues(current => ({ ...current, [field.key]: value }))} editable={!busy} style={[styles.summary, { borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 12, marginTop: 6 }]} multiline autoCapitalize="sentences" />
            </View>)}
            <Pressable style={[styles.secondary, { minHeight: 48 }]} disabled={Boolean(busy)} onPress={confirm}><Text style={styles.secondaryText}>{busy ? 'Attendi…' : 'Conferma ed esegui'}</Text></Pressable>
            <Pressable style={[styles.secondary, { marginTop: 12, minHeight: 48 }]} disabled={Boolean(busy)} onPress={() => setReviewIndex(null)}><Text style={styles.secondaryText}>Annulla</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 17 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(66,232,224,0.08)', borderWidth: 1, borderColor: 'rgba(66,232,224,0.18)' },
  label: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  summary: { color: colors.text, fontSize: 14.5, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  secondary: { minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.045)', paddingHorizontal: 12, flexDirection: 'row', gap: 7, alignItems: 'center' },
  secondaryText: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
});
