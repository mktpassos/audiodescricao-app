import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator } from 'react-native';

// 🔗 Endereço do backend (preferência: variável de ambiente do Expo)
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://audiodescricao-app.vercel.app/api/descrever-imagem';

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
      console.log('[APP DEBUG] Enviando para:', API_URL);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      // Resposta pode ser JSON ou texto (ex.: erro de proxy/ngrok)
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof payload === 'string'
            ? payload
            : JSON.stringify(payload, null, 2);
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }

      console.log('[APP DEBUG] Resposta do Backend:', payload);
      setResult(payload);
    } catch (err) {
      console.error('[APP ERROR]', err);
      setError(String(err));
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
