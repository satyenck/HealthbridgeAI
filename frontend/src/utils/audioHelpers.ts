/**
 * Audio encoding and processing utilities
 */

/**
 * Convert audio file URI to base64 string
 */
export const audioFileToBase64 = async (uri: string): Promise<string> => {
  const RNFS = require('react-native-fs');
  try {
    const base64 = await RNFS.readFile(uri, 'base64');
    return base64;
  } catch (error) {
    console.error('Error converting audio to base64:', error);
    throw new Error('Failed to convert audio file');
  }
};

/**
 * Get audio file size in bytes
 */
export const getAudioFileSize = async (uri: string): Promise<number> => {
  const RNFS = require('react-native-fs');
  try {
    const stat = await RNFS.stat(uri);
    return stat.size;
  } catch (error) {
    console.error('Error getting audio file size:', error);
    return 0;
  }
};

/**
 * Format audio file size to human-readable format
 */
export const formatAudioFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format recording duration (milliseconds to MM:SS)
 */
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Validate audio file size (max 10MB recommended for voice)
 */
export const isValidAudioSize = (bytes: number, maxMB: number = 10): boolean => {
  const maxBytes = maxMB * 1024 * 1024;
  return bytes <= maxBytes;
};

/**
 * Get audio MIME type from file extension
 */
export const getAudioMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'm4a':
      return 'audio/m4a';
    case 'mp4':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'aac':
      return 'audio/aac';
    default:
      return 'audio/m4a'; // Default for iOS recordings
  }
};

/**
 * Clean up audio file after upload
 */
export const deleteAudioFile = async (uri: string): Promise<void> => {
  const RNFS = require('react-native-fs');
  try {
    const exists = await RNFS.exists(uri);
    if (exists) {
      await RNFS.unlink(uri);
    }
  } catch (error) {
    console.error('Error deleting audio file:', error);
    // Non-critical error, don't throw
  }
};

/**
 * Check if audio recording is supported
 */
export const isAudioRecordingSupported = (): boolean => {
  // Audio recording is supported on both iOS and Android
  return true;
};

/**
 * Estimate audio duration from file size (rough estimation)
 * Assumes AAC encoding at ~128kbps
 */
export const estimateDuration = (bytes: number): number => {
  const bitrate = 128000; // 128 kbps
  const durationSeconds = (bytes * 8) / bitrate;
  return Math.round(durationSeconds * 1000); // Return in milliseconds
};

/**
 * Validate audio format
 */
export const isValidAudioFormat = (filename: string): boolean => {
  const validFormats = ['m4a', 'mp4', 'mp3', 'wav', 'aac'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? validFormats.includes(ext) : false;
};
