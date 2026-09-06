import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OneAIResult } from '../native/oneAI';
import { canExecuteOneAction, executeCoordinatedAction } from '../native/oneActionCoordinator';
import { saveOneMemory } from '../native/oneData';
import { colors } from '../theme/colors';

type Props = {
  result: OneAIResult;
  userId: string;
  onChanged?: () => void;
};

export function NativeAIResponseCard({ result, userId, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const saveRecall = async () => {
    if (saved) return;
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
      setBusy(null);
    }
  };

  const run = (index: number) => {
    const source = result.actions[index];
    if (!source || !canExecuteOneAction(source)) return;

    const kind = String(source.kind ?? source.type ?? 'azione');
    const cloudAction = kind.startsWith('create_') || kind === 'update_site_progress';
    Alert.alert(
      source.label || 'Esegui azione',
      cloudAction
        ? 'ONE registrerà questa operazione nei tuoi dati. Vuoi continuare?'
        : 'ONE eseguirà questa azione sul dispositivo. Vuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          onPress: async () => {
            setBusy(`action-${index}`);
            try {
              const outcome = await executeCoordinatedAction(userId, source);
              Alert.alert(outcome.ok ? 'Fatto' : 'Azione non completata', outcome.message || 'Operazione completata.');
              if (outcome.ok) onChanged?.();
            } catch (error) {
              Alert.alert('Azione non riuscita', error instanceof Error ? error.message : 'Riprova tra poco.');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.badge}><Ionicons name="sparkles-outline" size={16} color={colors.cyan} /></View>
        <Text style={styles.label}>ONE</Text>
      </View>
      <Text selectable style={styles.summary}>{result.summary}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={saveRecall} disabled={busy === 'recall' || saved}>
          <Ionicons name={saved ? 'checkmark-outline' : 'bookmark-outline'} size={16} color={saved ? colors.green : colors.text} />
          <Text style={styles.secondaryText}>{saved ? 'Salvato in Recall' : 'Salva in Recall'}</Text>
        </Pressable>
        {result.actions.map((action, index) => {
          if (!canExecuteOneAction(action)) return null;
          return (
            <Pressable key={`${action.label}-${index}`} style={styles.secondary} onPress={() => run(index)} disabled={busy === `action-${index}`}>
              <Ionicons name="flash-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryText}>{busy === `action-${index}` ? 'Attendi…' : action.label || 'Esegui'}</Text>
            </Pressable>
          );
        })}
      </View>
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
