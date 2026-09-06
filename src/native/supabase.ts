import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://frehflwcnghrmqpzbpno.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_SuYaTiqS5F9OifFyuadFEA_xkAqQujw';

const CHUNK_SIZE = 1800;
const manifestKey = (key: string) => `${key}.one_chunks`;
const chunkKey = (key: string, index: number) => `${key}.one_${index}`;

async function removeChunkedValue(key: string) {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  const count = Number(manifest || 0);
  for (let index = 0; index < count; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index));
  }
  await SecureStore.deleteItemAsync(manifestKey(key));
  await SecureStore.deleteItemAsync(key);
}

const secureStorage = {
  async getItem(key: string) {
    const manifest = await SecureStore.getItemAsync(manifestKey(key));
    const count = Number(manifest || 0);
    if (!count) return SecureStore.getItemAsync(key);

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    if (chunks.some((chunk) => chunk == null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string) {
    await removeChunkedValue(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
  },

  async removeItem(key: string) {
    await removeChunkedValue(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const oneBackend = {
  url: SUPABASE_URL,
  configured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
};
