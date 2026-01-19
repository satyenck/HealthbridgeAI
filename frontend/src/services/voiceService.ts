import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {Platform} from 'react-native';

// AudioRecorderPlayer is a singleton instance (not a class), so we use it directly
// No need for lazy initialization or calling 'new' - just use the exported instance

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
        // Dynamic import for Android only
        const {PermissionsAndroid} = require('react-native');
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

    // Use app-specific directory paths
    const RNFS = require('react-native-fs');
    const path = Platform.select({
      ios: 'healthbridge_recording.m4a',
      android: `${RNFS.CachesDirectoryPath}/healthbridge_recording.m4a`,
    });

    // Proper audio settings for NitroModules
    const audioSet = {
      AudioEncoderAndroid: 3, // AAC encoder (AudioEncoderAndroidType.AAC)
      AudioSamplingRate: 16000,
      AudioChannels: 1,
      AudioEncodingBitRate: 128000,
    };

    recordingStartTime = Date.now();
    const uri = await AudioRecorderPlayer.startRecorder(path, audioSet, false);
    console.log('Recording started at:', uri);
    AudioRecorderPlayer.addRecordBackListener((e) => {
      // Log recording progress
      console.log('Recording position:', e.currentPosition);
    });

    return uri;
  },

  /**
   * Stop recording and return recording details
   */
  async stopRecording(): Promise<RecordingResult> {
    const result = await AudioRecorderPlayer.stopRecorder();
    AudioRecorderPlayer.removeRecordBackListener();

    // Calculate duration
    const duration = recordingStartTime > 0 ? Date.now() - recordingStartTime : 0;

    // Get file stats
    const RNFS = require('react-native-fs');
    const stat = await RNFS.stat(result);

    // Validate recording
    if (stat.size < 1000) {
      throw new Error('Recording is too short or empty. Please record for at least 2 seconds.');
    }

    if (duration < 2000) {
      throw new Error('Recording duration must be at least 2 seconds.');
    }

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
    await AudioRecorderPlayer.startPlayer(uri);
    AudioRecorderPlayer.addPlayBackListener((e) => {
      // You can use this for playback progress updates
      // console.log('Playback:', e.currentPosition, '/', e.duration);
      if (e.currentPosition === e.duration) {
        AudioRecorderPlayer.stopPlayer();
      }
    });
  },

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    await AudioRecorderPlayer.stopPlayer();
    AudioRecorderPlayer.removePlayBackListener();
  },

  /**
   * Pause playback
   */
  async pausePlayback(): Promise<void> {
    await AudioRecorderPlayer.pausePlayer();
  },

  /**
   * Resume playback
   */
  async resumePlayback(): Promise<void> {
    await AudioRecorderPlayer.resumePlayer();
  },

  /**
   * Clean up resources
   */
  cleanup(): void {
    AudioRecorderPlayer.removeRecordBackListener();
    AudioRecorderPlayer.removePlayBackListener();
  },
};
