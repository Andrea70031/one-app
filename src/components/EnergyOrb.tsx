import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export type OrbState = 'idle' | 'activating' | 'listening' | 'thinking' | 'done';

type Props = {
  state: OrbState;
  size: number;
  label?: string;
  compact?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const speeds: Record<OrbState, { primary: number; secondary: number; orbit: number; pulse: number }> = {
  idle: { primary: 9200, secondary: 13200, orbit: 7600, pulse: 1900 },
  activating: { primary: 2600, secondary: 3900, orbit: 2200, pulse: 520 },
  listening: { primary: 4200, secondary: 5900, orbit: 3500, pulse: 680 },
  thinking: { primary: 1550, secondary: 2350, orbit: 1900, pulse: 920 },
  done: { primary: 12000, secondary: 12000, orbit: 12000, pulse: 1200 },
};

export function EnergyOrb({
  state,
  size,
  label,
  compact = false,
  onPress,
  accessibilityLabel = 'Attiva ONE',
}: Props) {
  const rotatePrimary = useRef(new Animated.Value(0)).current;
  const rotateSecondary = useRef(new Animated.Value(0)).current;
  const rotateOrbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const done = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rotatePrimary.setValue(0);
    rotateSecondary.setValue(0);
    rotateOrbit.setValue(0);
    pulse.setValue(0);
    ripple.setValue(0);
    shimmer.setValue(0);
    done.setValue(0);

    const motion = speeds[state];
    const primaryLoop = Animated.loop(
      Animated.timing(rotatePrimary, {
        toValue: 1,
        duration: motion.primary,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const secondaryLoop = Animated.loop(
      Animated.timing(rotateSecondary, {
        toValue: 1,
        duration: motion.secondary,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const orbitLoop = Animated.loop(
      Animated.timing(rotateOrbit, {
        toValue: 1,
        duration: motion.orbit,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, {
          toValue: 1,
          duration: state === 'activating' ? 720 : 1150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ripple, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
      ]),
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: state === 'thinking' ? 420 : 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: state === 'thinking' ? 420 : 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    if (state === 'done') {
      Animated.spring(done, {
        toValue: 1,
        damping: 11,
        stiffness: 165,
        mass: 0.72,
        useNativeDriver: true,
      }).start();
      shimmerLoop.start();
    } else {
      primaryLoop.start();
      secondaryLoop.start();
      orbitLoop.start();
      pulseLoop.start();
      shimmerLoop.start();
      if (state === 'activating' || state === 'listening' || state === 'thinking') rippleLoop.start();
    }

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      orbitLoop.stop();
      pulseLoop.stop();
      rippleLoop.stop();
      shimmerLoop.stop();
    };
  }, [done, pulse, ripple, rotateOrbit, rotatePrimary, rotateSecondary, shimmer, state]);

  const primaryRotation = rotatePrimary.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const secondaryRotation = rotateSecondary.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const orbitRotation = rotateOrbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbitReverseRotation = rotateOrbit.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange:
      state === 'activating'
        ? [0.97, 1.07]
        : state === 'listening'
          ? [0.985, 1.045]
          : state === 'thinking'
            ? [0.995, 1.025]
            : [0.988, 1.022],
  });
  const doneScale = done.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.2, state === 'thinking' ? 0.92 : 0.62] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.14] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.4, 0.12, 0] });
  const driftX = pulse.interpolate({ inputRange: [0, 1], outputRange: [-8, 9] });
  const driftY = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, -7] });
  const driftXReverse = pulse.interpolate({ inputRange: [0, 1], outputRange: [5.6, -6.3] });
  const driftYReverse = pulse.interpolate({ inputRange: [0, 1], outputRange: [-3.9, 4.55] });

  const coreSize = size * 0.78;
  const ringPadding = compact ? 3 : 5;
  const cutoutPadding = compact ? 5 : 10;
  const orbitOneWidth = compact ? size * 0.94 : size * 1.02;
  const orbitOneHeight = compact ? size * 0.48 : size * 0.52;
  const orbitTwoWidth = compact ? size * 0.88 : size * 0.96;
  const orbitTwoHeight = compact ? size * 0.42 : size * 0.45;

  const particles = useMemo(
    () =>
      Array.from({ length: compact ? 6 : 16 }, (_, index) => ({
        left: 10 + ((index * 23) % 80),
        top: 9 + ((index * 31) % 82),
        size: compact ? 1.2 + (index % 2) : 1.5 + (index % 3),
        opacity: 0.3 + (index % 4) * 0.14,
      })),
    [compact],
  );

  const content = (
    <Animated.View
      style={[
        styles.canvas,
        { width: size, height: size },
        { transform: [{ scale: state === 'done' ? doneScale : scale }] },
      ]}
    >
      {(state === 'activating' || state === 'listening' || state === 'thinking') && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            {
              width: coreSize * 1.12,
              height: coreSize * 1.12,
              borderRadius: coreSize,
              left: (size - coreSize * 1.12) / 2,
              top: (size - coreSize * 1.12) / 2,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.orbitLayer, { width: size, height: size, transform: [{ rotate: orbitRotation }] }]}
      >
        <View
          style={[
            styles.orbitEllipse,
            {
              width: orbitOneWidth,
              height: orbitOneHeight,
              left: (size - orbitOneWidth) / 2,
              top: (size - orbitOneHeight) / 2,
              borderRadius: orbitOneHeight / 2,
              transform: [{ rotate: '18deg' }],
              borderColor: state === 'listening' ? 'rgba(66,232,224,0.62)' : 'rgba(90,141,255,0.48)',
            },
          ]}
        >
          <View style={[styles.orbitNode, { backgroundColor: colors.cyan, right: -3, top: orbitOneHeight / 2 - 3 }]} />
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.orbitLayer, { width: size, height: size, transform: [{ rotate: orbitReverseRotation }] }]}
      >
        <View
          style={[
            styles.orbitEllipse,
            {
              width: orbitTwoWidth,
              height: orbitTwoHeight,
              left: (size - orbitTwoWidth) / 2,
              top: (size - orbitTwoHeight) / 2,
              borderRadius: orbitTwoHeight / 2,
              transform: [{ rotate: '-32deg' }],
              borderColor: 'rgba(242,123,196,0.42)',
            },
          ]}
        >
          <View style={[styles.orbitNode, { backgroundColor: colors.pink, left: -3, top: orbitTwoHeight / 2 - 3 }]} />
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.coreGlow,
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            left: (size - coreSize) / 2,
            top: (size - coreSize) / 2,
            opacity: shimmerOpacity,
          },
        ]}
      />

      <View
        style={[
          styles.core,
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            left: (size - coreSize) / 2,
            top: (size - coreSize) / 2,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.cyan, colors.blue, colors.violet, colors.pink, colors.amber, colors.cyan]}
          start={{ x: 0.05, y: 0.05 }}
          end={{ x: 0.94, y: 0.92 }}
          style={[styles.gradientRing, { borderRadius: coreSize / 2, padding: ringPadding }]}
        >
          <View
            style={[
              styles.cutout,
              {
                borderRadius: coreSize / 2 - ringPadding,
                padding: cutoutPadding,
              },
            ]}
          >
            <View style={[styles.surface, { borderRadius: coreSize / 2 - ringPadding - cutoutPadding }]}> 
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.swirl,
                  {
                    width: coreSize * 0.82,
                    height: coreSize * 0.54,
                    borderRadius: coreSize * 0.3,
                    opacity: shimmerOpacity,
                    transform: [
                      { rotate: secondaryRotation },
                      { translateX: driftX },
                      { translateY: driftY },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(66,232,224,0.06)', 'rgba(40,121,255,0.78)', 'rgba(167,102,255,0.54)', 'rgba(242,123,196,0.08)']}
                  start={{ x: 0, y: 0.2 }}
                  end={{ x: 1, y: 0.8 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.swirl,
                  {
                    width: coreSize * 0.68,
                    height: coreSize * 0.38,
                    borderRadius: coreSize * 0.24,
                    opacity: shimmerOpacity,
                    transform: [
                      { rotate: primaryRotation },
                      { translateX: driftXReverse },
                      { translateY: driftYReverse },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(90,141,255,0.02)', 'rgba(66,232,224,0.54)', 'rgba(167,102,255,0.64)', 'rgba(242,123,196,0.04)']}
                  start={{ x: 0.1, y: 0.8 }}
                  end={{ x: 0.9, y: 0.1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <Animated.View pointerEvents="none" style={[styles.particleLayer, { opacity: shimmerOpacity }]}> 
                {particles.map((particle, index) => (
                  <View
                    key={index}
                    style={[
                      styles.particle,
                      {
                        left: `${particle.left}%` as `${number}%`,
                        top: `${particle.top}%` as `${number}%`,
                        width: particle.size,
                        height: particle.size,
                        opacity: particle.opacity,
                      },
                    ]}
                  />
                ))}
              </Animated.View>

              {!compact && state === 'listening' && <ListeningWave pulse={pulse} size={coreSize} />}

              {label ? (
                <Text
                  style={[
                    styles.label,
                    { fontSize: compact ? 10 : state === 'done' ? 44 : 24, letterSpacing: compact ? 5 : 12 },
                    state === 'done' && { color: colors.green },
                  ]}
                >
                  {label}
                </Text>
              ) : (
                <View style={[styles.darkCore, { width: coreSize * 0.52, height: coreSize * 0.52, borderRadius: coreSize * 0.28 }]} />
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={compact ? 4 : 8}>
      {content}
    </Pressable>
  );
}

function ListeningWave({ pulse, size }: { pulse: Animated.Value; size: number }) {
  const grow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 1] });
  const shrink = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.48] });
  return (
    <View style={styles.waveRow}>
      {[0.56, 0.92, 0.72, 1, 0.64, 0.84, 0.52].map((height, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              height: size * 0.3 * height,
              transform: [{ scaleY: index % 2 === 0 ? grow : shrink }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitEllipse: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  orbitNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.95,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(90,141,255,0.52)',
  },
  coreGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(83,112,255,0.12)',
    shadowColor: '#5A8DFF',
    shadowOpacity: 0.78,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 0 },
  },
  core: {
    position: 'absolute',
    shadowColor: '#729DFF',
    shadowOpacity: 0.52,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  gradientRing: {
    flex: 1,
  },
  cutout: {
    flex: 1,
    backgroundColor: '#050810',
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060A12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  swirl: {
    position: 'absolute',
    overflow: 'hidden',
  },
  particleLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#C9FDFF',
    shadowColor: '#B8FBFF',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  darkCore: {
    backgroundColor: 'rgba(3,5,10,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  label: {
    color: colors.text,
    fontWeight: '300',
    paddingLeft: 12,
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
    shadowColor: colors.cyan,
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
