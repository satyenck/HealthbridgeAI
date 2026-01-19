// Mock for react-native-audio-recorder-player on web
class AudioRecorderPlayer {
  startRecorder = async () => {
    console.warn('Audio recording not supported on web');
    return '';
  };

  stopRecorder = async () => {
    console.warn('Audio recording not supported on web');
    return '';
  };

  startPlayer = async () => {
    console.warn('Audio playback not supported on web');
    return '';
  };

  stopPlayer = async () => {
    console.warn('Audio playback not supported on web');
  };

  pausePlayer = async () => {
    console.warn('Audio playback not supported on web');
  };

  resumePlayer = async () => {
    console.warn('Audio playback not supported on web');
  };

  addPlayBackListener = () => {
    return { remove: () => {} };
  };

  removePlayBackListener = () => {};
}

export default AudioRecorderPlayer;
