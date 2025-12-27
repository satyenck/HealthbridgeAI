import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {Platform, PermissionsAndroid} from 'react-native';

const audioRecorderPlayer = new AudioRecorderPlayer();

export interface RecordingResult {
  uri: string;
  duration: number;
  size: number;
}

let recordingStartTime: number = 0;

export const voiceService = {
  /**
   * Request audio recording permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'HealthbridgeAI needs access to your microphone to record voice notes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    // iOS permissions are handled via Info.plist
    return true;
  },

  /**
   * Start recording audio
   */
  async startRecording(): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    const path = Platform.select({
      ios: 'healthbridge_recording.m4a',
      android: 'sdcard/healthbridge_recording.mp4',
    });

    recordingStartTime = Date.now();
    const uri = await audioRecorderPlayer.startRecorder(path);
    audioRecorderPlayer.addRecordBackListener((e) => {
      // You can use this for real-time duration updates in the UI
      // console.log('Recording:', e.currentPosition);
    });

    return uri;
  },

  /**
   * Stop recording and return recording details
   */
  async stopRecording(): Promise<RecordingResult> {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();

    // Calculate duration
    const duration = recordingStartTime > 0 ? Date.now() - recordingStartTime : 0;

    // Get file stats
    const RNFS = require('react-native-fs');
    const stat = await RNFS.stat(result);

    return {
      uri: result,
      duration: duration,
      size: stat.size,
    };
  },

  /**
   * Convert audio file to base64 string for API
   */
  async audioToBase64(uri: string): Promise<string> {
    const RNFS = require('react-native-fs');
    const base64 = await RNFS.readFile(uri, 'base64');
    return base64;
  },

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioBase64: string): Promise<string> {
    const apiService = require('./apiService').default;
    const {API_ENDPOINTS} = require('../config/api');

    const response = await apiService.post(API_ENDPOINTS.TRANSCRIBE_VOICE, {
      audio_base64: audioBase64,
    });

    return response.transcribed_text || response.transcription || '';
  },

  /**
   * Play recorded audio
   */
  async startPlayback(uri: string): Promise<void> {
    await audioRecorderPlayer.startPlayer(uri);
    audioRecorderPlayer.addPlayBackListener((e) => {
      // You can use this for playback progress updates
      // console.log('Playback:', e.currentPosition, '/', e.duration);
      if (e.currentPosition === e.duration) {
        audioRecorderPlayer.stopPlayer();
      }
    });
  },

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
  },

  /**
   * Pause playback
   */
  async pausePlayback(): Promise<void> {
    await audioRecorderPlayer.pausePlayer();
  },

  /**
   * Resume playback
   */
  async resumePlayback(): Promise<void> {
    await audioRecorderPlayer.resumePlayer();
  },

  /**
   * Clean up resources
   */
  cleanup(): void {
    audioRecorderPlayer.removeRecordBackListener();
    audioRecorderPlayer.removePlayBackListener();
  },
};
