import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export type OrbState =
  | 'idle'
  | 'activating'
  | 'listening'
  | 'thinking'
  | 'done';

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
  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const done = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    breathe.setValue(0);
    spin.setValue(0);
    wave.setValue(0);
    done.setValue(0);

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: state === 'listening' ? 600 : 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: state === 'listening' ? 600 : 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const spinning = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: state === 'thinking' ? 1200 : 4600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const waving = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    if (state === 'done') {
      Animated.spring(done, {
        toValue: 1,
        damping: 10,
        stiffness: 150,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else {
      breathing.start();
      spinning.start();
      if (state === 'listening') waving.start();
    }

    return () => {
      breathing.stop();
      spinning.stop();
      waving.stop();
    };
  }, [breathe, done, spin, state, wave]);

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: state === 'activating' ? [1, 1.08] : [0.985, 1.025],
  });

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveScale = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const waveOpacity = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.9],
  });

  const doneScale = done.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${12 + ((i * 17) % 76)}%` as `${number}%`,
        top: `${12 + ((i * 29) % 76)}%` as `${number}%`,
        size: 1.5 + (i % 3),
        opacity: 0.28 + (i % 4) * 0.14,
      })),
    []
  );

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Attiva ONE"
        onPress={onPress}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              transform: [
                { scale: state === 'done' ? doneScale : scale },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.cyan, colors.blue, colors.violet, colors.pink, colors.amber, colors.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          >
            <View style={styles.ringCutout}>
              <View style={styles.innerSurface}>
                {(state === 'thinking' || state === 'activating') &&
                  particles.map((p, index) => (
                    <View
                      key={index}
                      style={[
                        styles.particle,
                        {
                          left: p.left,
                          top: p.top,
                          width: p.size,
                          height: p.size,
                          opacity: p.opacity,
                        },
                      ]}
                    />
                  ))}

                {state === 'listening' && (
                  <View style={styles.waveRow}>
                    {[0.55, 0.9, 0.7, 1, 0.62, 0.82, 0.5].map((height, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            height: 64 * height,
                            opacity: waveOpacity,
                            transform: [
                              {
                                scaleY:
                                  i % 2 === 0
                                    ? waveScale
                                    : wave.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 0.45],
                                      }),
                              },
                            ],
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}

                <Text
                  style={[
                    styles.logoText,
                    state === 'done' && { color: colors.green, fontSize: 46 },
                  ]}
                >
                  {stateCopy[state].title}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      <Text
        style={[
          styles.subtitle,
          state === 'done' && { color: colors.green },
        ]}
      >
        {stateCopy[state].subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressable: {
    width: 278,
    height: 278,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 252,
    height: 252,
    borderRadius: 126,
    shadowColor: '#729DFF',
    shadowOpacity: 0.38,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  gradientRing: {
    flex: 1,
    borderRadius: 126,
    padding: 5,
  },
  ringCutout: {
    flex: 1,
    borderRadius: 122,
    padding: 13,
    backgroundColor: '#06090F',
  },
  innerSurface: {
    flex: 1,
    borderRadius: 110,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070B12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logoText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 12,
    paddingLeft: 12,
  },
  subtitle: {
    marginTop: 16,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#B8FBFF',
  },
  waveRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: colors.cyan,
  },
});
