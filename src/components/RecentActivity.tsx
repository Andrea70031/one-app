import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RecentItem } from '../data/recent';
import { colors } from '../theme/colors';

type Props = { item: RecentItem };

const iconMap: Record<RecentItem['icon'], keyof typeof Ionicons.glyphMap> = {
  document: 'document-text-outline',
  restaurant: 'restaurant-outline',
  airplane: 'airplane-outline',
  briefcase: 'briefcase-outline',
};

export function RecentActivity({ item }: Props) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={['rgba(66,232,224,0.18)', 'rgba(167,102,255,0.16)']}
        style={styles.iconBox}
      >
        <Ionicons name={iconMap[item.icon]} size={20} color={colors.text} />
      </LinearGradient>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text>
      </View>

      <View style={styles.timeWrap}>
        <Text style={styles.time}>{item.time}</Text>
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.075)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12.5,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
  },
});
