import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export type CaptureKind = 'camera' | 'photo' | 'document' | 'audio';

export type CaptureItem = {
  id: string;
  kind: CaptureKind;
  uri?: string;
  name: string;
  detail?: string;
  mimeType?: string;
  base64?: string;
  size?: number;
};

export function CapturePreview({ item, onRemove }: { item: CaptureItem; onRemove?: () => void }) {
  const isImage = (item.kind === 'camera' || item.kind === 'photo') && item.uri;

  return (
    <View style={styles.card}>
      {isImage ? (
        <Image source={{ uri: item.uri }} style={styles.thumb} />
      ) : (
        <View style={styles.iconBox}>
          <Ionicons
            name={item.kind === 'document' ? 'document-text-outline' : 'mic-outline'}
            size={26}
            color={colors.text}
          />
        </View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{item.name}</Text>
        <Text numberOfLines={2} style={styles.detail}>{item.detail ?? 'Pronto per essere elaborato da ONE'}</Text>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.removeButton} accessibilityLabel={`Rimuovi ${item.name}`}>
          <Ionicons name="close" size={17} color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PRONTO</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 15,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,102,255,0.14)',
  },
  copy: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  detail: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(70,227,183,0.12)',
  },
  badgeText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
