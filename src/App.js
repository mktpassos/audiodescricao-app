import React, { useState, useEffect, useRef, useCallback } from 'react';

// Este código foi escrito pelo Gemini.
const App = () => {
  // Estados
  const [imageSrc, setImageSrc] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isAnswerSpeaking, setIsAnswerSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommandStatus, setVoiceCommandStatus] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const fileInputRef = useRef(null);
  const recognition = useRef(null);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Efeitos de inicialização e limpeza
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognition.current) recognition.current.stop();
    };
  }, []);
  
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }, []);
  
  const handleAnalyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError('');
    setDescription('');
    setAnswer(''); 
    speakText('Analisando imagem, por favor aguarde.');
    try {
      const base64ImageData = await fileToBase64(imageFile);
      const prompt = "Descreva esta imagem de forma detalhada para uma pessoa com deficiência visual. Inclua cores, objetos, ações e o contexto geral da cena.";
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: imageFile.type, data: base64ImageData } }] }] };
      const apiKey = "SUA_CHAVE_API_AQUI"; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API: ${errorData.error.message || response.statusText}`);
      }
      const result = await response.json();
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
        setDescription(result.candidates[0].content.parts[0].text);
      } else {
        setError('Não foi possível gerar uma descrição para esta imagem.');
        speakText('Não foi possível gerar uma descrição.');
      }
    } catch (err) {
      setError(`Erro: ${err.message || 'Falha ao processar a imagem.'}`);
      speakText('Ocorreu um erro ao processar a imagem.');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, speakText, fileToBase64]);

  const handleSpeakDescription = useCallback(() => {
    if (!description) return;
    setIsSpeaking(true);
    speakText(description); 
    const utterance = new SpeechSynthesisUtterance(description);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [description, speakText]);
  
  useEffect(() => {
    if (imageFile) {
      handleAnalyzeImage();
    }
  }, [imageFile, handleAnalyzeImage]);
  
  useEffect(() => {
    if (description && !isLoading) {
      handleSpeakDescription();
    }
  }, [description, isLoading, handleSpeakDescription]);

  const handleCopyText = useCallback(() => {
    if (!description) return;
    navigator.clipboard.writeText(description).then(() => {
      setCopySuccess('Copiado!');
      speakText('Texto copiado');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Falha ao copiar');
      speakText('Falha ao copiar o texto');
    });
  }, [description, speakText]);

  const handleImageChange = (event) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    handleReset();
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const togglePlayback = () => {
    if (isSpeaking) stopSpeaking();
    else handleSpeakDescription();
  };
  
  const handleReset = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setImageSrc(null);
    setImageFile(null);
    setDescription('');
    setError('');
    setQuestion('');
    setAnswer('');
    setIsLoading(false);
    setIsSpeaking(false);
    setIsAnswering(false);
    setIsAnswerSpeaking(false);
    setVoiceCommandStatus('');
    setCopySuccess('');
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleAskQuestion = useCallback(async () => {
    if (!imageFile || !question.trim()) return;
    setIsAnswering(true);
    setError('');
    setAnswer('');
    speakText("A pensar na sua pergunta...");
    try {
        const base64ImageData = await fileToBase64(imageFile);
        const chatHistory = description ? [{ role: "model", parts: [{ text: description }] }] : [];
        const payload = { contents: [...chatHistory, { role: "user", parts: [{ text: question }, { inlineData: { mimeType: imageFile.type, data: base64ImageData } }] }] };
        const apiKey = "SUA_CHAVE_API_AQUI"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${errorData.error.message || response.statusText}`);
        }
        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]) {
            setAnswer(result.candidates[0].content.parts[0].text);
        } else {
            setError('Não foi possível obter uma resposta.');
            speakText('Não consegui encontrar uma resposta.');
        }
    } catch (err) {
        setError(`Erro: ${err.message || 'Falha ao processar a pergunta.'}`);
        speakText('Ocorreu um erro ao processar a sua pergunta.');
    } finally {
        setIsAnswering(false);
    }
  }, [imageFile, question, description, fileToBase64, speakText]);

  const handleSpeakAnswer = () => {
    if(answer) speakText(answer);
  };

  const toggleVoiceControl = () => { /* ...código de voz... */ };
  const processVoiceCommand = () => { /* ...código de voz... */ };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center font-sans">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl text-center border border-gray-700">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 text-left">
            Audiodescrição de Imagens
          </h1>
          {imageFile && !isLoading && (
            <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2" aria-label="Limpar e iniciar nova análise">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              <span>Limpar</span>
            </button>
          )}
        </div>

        {!imageFile ? (
          <div className="mb-6">
            <label htmlFor="image-upload" className="cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold py-4 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 inline-flex items-center space-x-3 text-xl" aria-label="Escolher imagem para audiodescrição">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.218A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.218A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>Escolher Imagem</span>
            </label>
            <input id="image-upload" type="file" accept="image/*" capture="camera" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
          </div>
        ) : null}
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center my-8">
            <svg className="animate-spin h-12 w-12 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-xl mt-4 text-yellow-400">A analisar imagem...</div>
          </div>
        )}

        {imageSrc && !isLoading && (
          <div className="mb-6">
            <img src={imageSrc} alt="Pré-visualização" className="max-w-full h-auto rounded-lg shadow-md mx-auto border-2 border-gray-600" style={{ maxHeight: '300px' }} />
          </div>
        )}

        {imageFile && <button onClick={toggleVoiceControl} className={`w-full ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-4 text-xl`}>
          {isListening ? 'A ouvir... (Clique para parar)' : 'Ativar Comando de Voz'}
        </button>}
        
        {error && <div className="bg-red-900 border border-red-700 text-white font-bold py-3 px-4 rounded-lg mb-4">{error}</div>}
        
        {description && !isLoading && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4 text-left border border-gray-600">
            <h2 className="text-2xl font-semibold mb-2 text-yellow-300">Audiodescrição:</h2>
            <p className="text-lg leading-relaxed">{description}</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button onClick={togglePlayback} className={`flex-1 ${isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 px-4 rounded-full shadow-lg transition text-lg`}>
                {isSpeaking ? 'Parar Áudio' : 'Ouvir Descrição'}
              </button>
              <button onClick={handleCopyText} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition text-lg">
                {copySuccess ? copySuccess