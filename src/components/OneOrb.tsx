import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EnergyOrb, OrbState } from './EnergyOrb';
import { colors } from '../theme/colors';

export type { OrbState } from './EnergyOrb';

type Props = {
  state: OrbState;
  onPress: () => void;
};

const stateCopy: Record<OrbState, { title: string; subtitle: string }> = {
  idle: { title: 'ONE', subtitle: 'Tocca per iniziare' },
  activating: { title: 'ONE', subtitle: 'Ci sono.' },
  listening: { title: 'ONE', subtitle: 'Ti ascolto…' },
  thinking: { title: 'ONE', subtitle: 'Sto lavorando per te…' },
  done: { title: '✓', subtitle: 'Fatto!' },
};

export function OneOrb({ state, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <EnergyOrb
        state={state}
        size={292}
        label={stateCopy[state].title}
        onPress={onPress}
        accessibilityLabel="Attiva ONE"
      />
      <Text style={[styles.subtitle, state === 'done' && styles.subtitleDone]}>
        {stateCopy[state].subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  subtitleDone: {
    color: colors.green,
  },
});
