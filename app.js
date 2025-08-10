import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const callApi = async () => {
    setLoading(true);
    try {
      // caminho relativo = mesmo domínio do seu site -> sem CORS
      const res = await fetch('/api/ping');
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ marginBottom: 16 }}>App Audiodescrição — Web</Text>

      <Pressable
        onPress={callApi}
        style={{
          backgroundColor: '#111827',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: 'white' }}>
          {loading ? 'Chamando API…' : 'Chamar /api/ping'}
        </Text>
      </Pressable>

      {result && (
        <Text style={{ fontFamily: 'monospace', textAlign: 'center' }}>
          {result}
        </Text>
      )}
    </View>
  );
}
