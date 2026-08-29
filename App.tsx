import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OneOrb, OrbState } from './src/components/OneOrb';
import { RecentActivity } from './src/components/RecentActivity';
import { recentItems } from './src/data/recent';
import { colors } from './src/theme/colors';

const stateSequence: OrbState[] = [
  'idle',
  'activating',
  'listening',
  'thinking',
  'done',
];

export default function App() {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [input, setInput] = useState('');

  const index = useMemo(() => stateSequence.indexOf(orbState), [orbState]);

  const advanceOrb = () => {
    const next = stateSequence[(index + 1) % stateSequence.length];
    if (next) setOrbState(next);
  };

  useEffect(() => {
    if (orbState === 'activating') {
      const t = setTimeout(() => setOrbState('listening'), 700);
      return () => clearTimeout(t);
    }

    if (orbState === 'done') {
      const t = setTimeout(() => setOrbState('idle'), 1900);
      return () => clearTimeout(t);
    }
  }, [orbState]);

  const submitText = () => {
    if (!input.trim()) {
      setOrbState('activating');
      return;
    }
    setOrbState('thinking');
    setTimeout(() => {
      setInput('');
      setOrbState('done');
    }, 1600);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#07101B', colors.background, '#040509']}
        locations={[0, 0.34, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.brand}>O N E</Text>

          <Pressable style={styles.avatar}>
            <LinearGradient
              colors={[colors.cyan, colors.violet, colors.pink]}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarInner}>
                <Ionicons name="person-outline" size={18} color={colors.text} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.greeting}>Ciao Andrea,</Text>
            <Text style={styles.tagline}>
              Mostrami, chiedi, delega.{'\n'}Io mi occupo del resto.
            </Text>
          </View>

          <OneOrb state={orbState} onPress={advanceOrb} />

          <View style={styles.askBar}>
            <View style={styles.spark}>
              <Ionicons name="sparkles-outline" size={18} color={colors.cyan} />
            </View>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submitText}
              placeholder="Chiedi qualsiasi cosa…"
              placeholderTextColor="#6F7786"
              style={styles.input}
              returnKeyType="send"
            />
            <Pressable onPress={() => setOrbState('listening')} style={styles.micButton}>
              <Ionicons name="mic-outline" size={19} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <QuickAction icon="camera-outline" label="Mostra" />
            <QuickAction icon="document-outline" label="Documento" />
            <QuickAction icon="image-outline" label="Foto" />
            <QuickAction icon="flash-outline" label="Azione" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attività recenti</Text>
            <Text style={styles.sectionLink}>Vedi tutte</Text>
          </View>

          <View style={styles.card}>
            {recentItems.slice(0, 3).map((item) => (
              <RecentActivity item={item} key={item.id} />
            ))}
          </View>

          <View style={styles.memoryCard}>
            <View style={styles.memoryIcon}>
              <LinearGradient
                colors={[colors.cyan, colors.blue, colors.violet, colors.pink]}
                style={styles.memoryGradient}
              >
                <View style={styles.memoryInner} />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memoryTitle}>La tua memoria privata</Text>
              <Text style={styles.memoryCopy}>
                ONE ricorda ciò che conta, così non devi farlo tu.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavItem icon="home-outline" active={true} />
          <NavItem icon="layers-outline" />
          <Pressable onPress={() => setOrbState('activating')} style={styles.navOrbWrap}>
            <LinearGradient
              colors={[colors.cyan, colors.blue, colors.violet, colors.pink]}
              style={styles.navOrb}
            >
              <View style={styles.navOrbInner} />
            </LinearGradient>
          </Pressable>
          <NavItem icon="search-outline" />
          <NavItem icon="person-outline" />
        </View>
      </SafeAreaView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Pressable style={styles.quickAction}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function NavItem({
  icon,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}) {
  return (
    <Pressable style={styles.navItem}>
      <Ionicons
        name={icon}
        size={21}
        color={active ? colors.cyan : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingTop: RNStatusBar.currentHeight ?? 0,
  },
  header: {
    height: 62,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 7,
    paddingLeft: 7,
    fontWeight: '500',
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 1.5,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#0B0F16',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  heroCopy: {
    alignItems: 'center',
    marginTop: 30,
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '400',
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 9,
  },
  askBar: {
    height: 58,
    marginTop: 28,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAction: {
    flex: 1,
    minHeight: 61,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickActionText: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 26,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  sectionLink: {
    color: '#B68AFF',
    fontSize: 13,
  },
  card: {
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memoryCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  memoryIcon: {
    width: 48,
    height: 48,
  },
  memoryGradient: {
    flex: 1,
    padding: 3,
    borderRadius: 24,
  },
  memoryInner: {
    flex: 1,
    borderRadius: 21,
    backgroundColor: '#080C12',
  },
  memoryTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '600',
  },
  memoryCopy: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(12,16,23,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  navItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navOrbWrap: {
    width: 58,
    height: 58,
  },
  navOrb: {
    flex: 1,
    borderRadius: 29,
    padding: 4,
  },
  navOrbInner: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: '#06090E',
  },
});
