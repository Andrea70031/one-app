import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { OneOrb, OrbState } from './src/components/OneOrb';
import { RecentActivity } from './src/components/RecentActivity';
import { CaptureItem, CapturePreview } from './src/components/CapturePreview';
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
  const [capture, setCapture] = useState<CaptureItem | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
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

  const finishCapture = (item: CaptureItem) => {
    setCapture(item);
    setOrbState('thinking');
    setTimeout(() => setOrbState('done'), 1200);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Fotocamera non disponibile', 'Consenti a ONE di usare la fotocamera nelle impostazioni.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({
        kind: 'camera',
        uri: asset.uri,
        name: asset.fileName ?? 'Foto scattata',
        detail: 'Immagine catturata dalla fotocamera',
      });
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Foto non disponibili', 'Consenti a ONE di accedere alle foto nelle impostazioni.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({
        kind: 'photo',
        uri: asset.uri,
        name: asset.fileName ?? 'Immagine',
        detail: 'Immagine scelta dalla libreria',
      });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      finishCapture({
        kind: 'document',
        uri: asset.uri,
        name: asset.name,
        detail: asset.mimeType ?? 'Documento selezionato',
      });
    }
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Microfono non disponibile', 'Consenti a ONE di usare il microfono nelle impostazioni.');
          return;
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
        setOrbState('listening');
      } else {
        await recorder.stop();
        setIsRecording(false);
        finishCapture({
          kind: 'audio',
          uri: recorder.uri ?? undefined,
          name: 'Registrazione vocale',
          detail: 'Audio pronto per trascrizione e comprensione',
        });
      }
    } catch {
      setIsRecording(false);
      setOrbState('idle');
      Alert.alert('Registrazione non riuscita', 'Riprova tra qualche secondo.');
    }
  };

  const submitText = () => {
    if (!input.trim()) {
      setOrbState('activating');
      return;
    }
    setOrbState('thinking');
    setTimeout(() => {
      setCapture({
        kind: 'document',
        name: 'Richiesta testuale',
        detail: input.trim(),
      });
      setInput('');
      setOrbState('done');
    }, 1000);
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
            <LinearGradient colors={[colors.cyan, colors.violet, colors.pink]} style={styles.avatarGradient}>
              <View style={styles.avatarInner}>
                <Ionicons name="person-outline" size={18} color={colors.text} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
            <Pressable
              onPress={toggleRecording}
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic-outline'}
                size={19}
                color={isRecording ? colors.green : colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <QuickAction icon="camera-outline" label="Mostra" onPress={takePhoto} />
            <QuickAction icon="document-outline" label="Documento" onPress={pickDocument} />
            <QuickAction icon="image-outline" label="Foto" onPress={pickPhoto} />
            <QuickAction
              icon={isRecording ? 'stop-circle-outline' : 'mic-outline'}
              label={isRecording ? 'Stop' : 'Parla'}
              onPress={toggleRecording}
            />
          </View>

          {capture && <CapturePreview item={capture} />}

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
              <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.memoryGradient}>
                <View style={styles.memoryInner} />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memoryTitle}>La tua memoria privata</Text>
              <Text style={styles.memoryCopy}>ONE ricorda ciò che conta, così non devi farlo tu.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavItem icon="home-outline" active />
          <NavItem icon="layers-outline" />
          <Pressable onPress={() => setOrbState('activating')} style={styles.navOrbWrap}>
            <LinearGradient colors={[colors.cyan, colors.blue, colors.violet, colors.pink]} style={styles.navOrb}>
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
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
      <Ionicons name={icon} size={21} color={active ? colors.cyan : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingTop: RNStatusBar.currentHeight ?? 0 },
  header: {
    height: 62, paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  headerButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  brand: { color: colors.text, fontSize: 18, letterSpacing: 7, paddingLeft: 7, fontWeight: '500' },
  avatar: { width: 40, height: 40 },
  avatarGradient: { flex: 1, borderRadius: 20, padding: 1.5 },
  avatarInner: { flex: 1, backgroundColor: '#0B0F16', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20 },
  heroCopy: { alignItems: 'center', marginTop: 30 },
  greeting: { color: colors.text, fontSize: 26, fontWeight: '400' },
  tagline: { color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 9 },
  askBar: {
    height: 58, marginTop: 28, paddingLeft: 12, paddingRight: 8, borderRadius: 29,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center',
  },
  spark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingHorizontal: 8 },
  micButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  micButtonRecording: {
    borderColor: 'rgba(70,227,183,0.5)',
    backgroundColor: 'rgba(70,227,183,0.08)',
  },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickAction: {
    flex: 1, minHeight: 61, borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  quickActionText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '500' },
  sectionHeader: {
    marginTop: 26, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sectionLink: { color: '#B68AFF', fontSize: 13 },
  card: {
    paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  memoryCard: {
    marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  memoryIcon: { width: 48, height: 48 },
  memoryGradient: { flex: 1, padding: 3, borderRadius: 24 },
  memoryInner: { flex: 1, borderRadius: 21, backgroundColor: '#080C12' },
  memoryTitle: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  memoryCopy: { marginTop: 4, color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  bottomNav: {
    position: 'absolute', bottom: 14, left: 20, right: 20, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(12,16,23,0.94)', borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  navItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navOrbWrap: { width: 58, height: 58 },
  navOrb: { flex: 1, borderRadius: 29, padding: 4 },
  navOrbInner: { flex: 1, borderRadius: 25, backgroundColor: '#06090E' },
});

