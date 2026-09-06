import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';

import { colors } from '../theme/colors';

type Props = {
  latitude?: number;
  longitude?: number;
  label?: string;
};

export function OneNativeMap({ latitude, longitude, label = 'ONE Mappe' }: Props) {
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.frame}>
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          {...(hasPosition
            ? {
                cameraPosition: {
                  coordinates: { latitude: latitude as number, longitude: longitude as number },
                  zoom: 14,
                },
                annotations: [
                  {
                    coordinates: { latitude: latitude as number, longitude: longitude as number },
                    title: label,
                  },
                ],
              }
            : {})}
        />
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.frame}>
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          {...(hasPosition
            ? {
                cameraPosition: {
                  coordinates: { latitude: latitude as number, longitude: longitude as number },
                  zoom: 14,
                },
                markers: [
                  {
                    coordinates: { latitude: latitude as number, longitude: longitude as number },
                    title: label,
                  },
                ],
              }
            : {})}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.fallback]}>
      <Text style={styles.fallbackTitle}>Mappe native</Text>
      <Text style={styles.fallbackText}>Disponibili nella build iPhone/Android di ONE.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 260,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fallback: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  fallbackText: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
