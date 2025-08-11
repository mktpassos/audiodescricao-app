import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator } from 'react-native';

// 🔗 URL BASE do backend (sem o /api/descrever-imagem)
// Se existir EXPO_PUBLIC_API_URL no .env, use-a; senão, usa o domínio do Vercel.
// Ex.: EXPO_PUBLIC_API_URL=https://audiodescricao-app.vercel.app
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://audiodescricao-app.vercel.app')
  .replace(/\/$/, ''); // remove barra final se houver

const ENDPOINT = `${API_BASE}/api/descrever-imagem`;

export default function App() {
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleDescribe() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[APP DEBUG] POST para:', ENDPOINT);

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // o backend aceita { imageUrl } ou { imagemEmBase64 }
        body: JSON.stringify({ imageUrl }),
      });

      const raw = await res.text();
      console.log('[RAW]', raw);

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        // às vezes, em erro de proxy, vem texto puro
        payload = raw;
      }

      if (!res.ok) {
        const msg = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }

      console.log('[APP DEBUG] Resposta do Backend:', payload);
      setResult(payload);
    } catch (err) {
      console.error('[APP ERROR]', err);
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, gap: 16, paddingTop: 60, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, marginBottom: 8 }}>
        App Audiodescrição — Web/Mobile
      </Text>

      <TextInput
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="URL da imagem"
        style={{
          width: '80%',
          maxWidth: 720,
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
        }}
      />

      <Button title="Descrever imagem" onPress={handleDescribe} />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

      {error && (
        <Text style={{ marginTop: 16, color: 'red' }}>{error}</Text>
      )}

      {result && (
        <View style={{ marginTop: 16, width: '80%', maxWidth: 720 }}>
          <Text style={{ fontWeight: 'bold' }}>Resposta:</Text>
          <Text>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}
