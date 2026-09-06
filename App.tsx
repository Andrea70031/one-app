import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { NativeAuthScreen } from './src/components/NativeAuthScreen';
import { OneAuthProvider, useOneAuth } from './src/native/auth';
import { NativeHome } from './src/native/NativeHome';
import { colors } from './src/theme/colors';

function Root() {
  const { loading, session } = useOneAuth();

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar style="light" />
        <LinearGradient colors={['#07101B', colors.background, '#040509']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingOrb} />
        <Text style={styles.brand}>O N E</Text>
        <ActivityIndicator color={colors.cyan} style={styles.spinner} />
      </View>
    );
  }

  if (!session) return <NativeAuthScreen />;
  return <NativeHome />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <OneAuthProvider>
        <Root />
      </OneAuthProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingOrb: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.cyan, backgroundColor: 'rgba(66,232,224,0.05)' },
  brand: { marginTop: 20, color: colors.text, fontSize: 18, letterSpacing: 8, paddingLeft: 8, fontWeight: '600' },
  spinner: { marginTop: 28 },
});
