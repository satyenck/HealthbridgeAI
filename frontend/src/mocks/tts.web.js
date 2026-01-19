// Mock for react-native-tts on web
const Tts = {
  speak: (text) => {
    console.log('TTS speak:', text);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  },

  stop: () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  setDefaultLanguage: (language) => {
    console.log('TTS language:', language);
  },

  getInitStatus: () => {
    return Promise.resolve('success');
  },

  setDefaultRate: (rate) => {
    console.log('TTS rate:', rate);
  },

  setDefaultPitch: (pitch) => {
    console.log('TTS pitch:', pitch);
  },

  addEventListener: (event, callback) => {
    return { remove: () => {} };
  },

  removeEventListener: (event, callback) => {},
};

export default Tts;
