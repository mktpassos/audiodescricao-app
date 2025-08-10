// 1. Carregar o 'cofre' (dotenv) e o Express
require('dotenv').config();
const express = require('express');

// 2. Iniciar o aplicativo
const app = express();
app.use(express.json({ limit: '50mb' })); // MUDANÇA 1: Aumentar limite de payload
app.use(express.urlencoded({ limit: '50mb', extended: true })); // MUDANÇA 2: Adicionar middleware para URL encoded

// 3. Pegar a chave da API que está segura no arquivo .env
const apiKey = process.env.GEMINI_API_KEY;

// 4. Definir a porta
const port = 3000;

// Rota principal de teste
app.get('/', (req, res) => {
  res.send('Nosso backend está funcionando e a chave da API foi carregada!');
});

// Rota para descrever a imagem (AGORA COM A LÓGICA DA IA)
app.post('/descrever-imagem', async (req, res) => {
  console.log('Recebi um pedido para descrever uma imagem...');
  
  // LOGS DE DEBUG - ADICIONADOS AQUI
  console.log('Corpo da requisição:', req.body);
  console.log('Headers:', req.headers);

  try {
    // Pegar os dados da imagem que o app enviará
    const { imagemEmBase64 } = req.body;

    if (!imagemEmBase64) {
      return res.status(400).json({ erro: 'Nenhuma imagem fornecida.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: "Descreva esta imagem em detalhes para uma pessoa com deficiência visual." },
            {
              inlineData: {
                mimeType: "image/jpeg", // ou o tipo de imagem que o app enviará
                data: imagemEmBase64
              }
            }
          ]
        }
      ]
    };
    
    // Usando fetch para chamar a API do Gemini
    // A partir do Node.js 18, o fetch já é nativo e não precisa de biblioteca extra.
    const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error('Erro da API Gemini:', errorData);
        throw new Error('Erro ao chamar a API do Gemini');
    }

    const data = await apiResponse.json();
    const descricao = data.candidates[0].content.parts[0].text;

    // MUDANÇA 3: Corrigir nome da propriedade para 'description' (como o app espera)
    res.json({ description: descricao });

  } catch (error) {
    console.error("Erro no endpoint /descrever-imagem:", error);
    res.status(500).json({ erro: 'Ocorreu um erro no servidor.' });
  }
});

// Ligar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  if (!apiKey) {
    console.error("ERRO: A chave GEMINI_API_KEY não foi encontrada. Verifique seu arquivo .env");
  } else {
    console.log("Chave da API carregada com sucesso.");
  }
});
