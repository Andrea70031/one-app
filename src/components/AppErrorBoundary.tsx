import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type State = { failed: boolean };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.error(JSON.stringify({ event: 'one_ui_error', name }));
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.root}>
        <View style={styles.orb} />
        <Text style={styles.title}>ONE si è fermato</Text>
        <Text style={styles.copy}>La sessione è al sicuro. Riprova ad aprire l’interfaccia.</Text>
        <Pressable style={styles.button} onPress={this.retry}>
          <Text style={styles.buttonText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  orb: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.cyan, backgroundColor: 'rgba(66,232,224,0.06)' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 22 },
  copy: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24, minWidth: 150, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(66,232,224,0.35)', backgroundColor: 'rgba(66,232,224,0.10)' },
  buttonText: { color: colors.cyan, fontSize: 14, fontWeight: '700' },
});
