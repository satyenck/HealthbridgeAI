import {pick, types, keepLocalCopy} from '@react-native-documents/picker';
import {launchImageLibrary, launchCamera, Asset} from 'react-native-image-picker';
import {Platform} from 'react-native';

export interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size: number;
}

const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

export const mediaService = {
  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Dynamic import for Android only
        const {PermissionsAndroid} = require('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'HealthbridgeAI needs access to your camera to take photos.',
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
    return true;
  },

  /**
   * Pick a PDF document
   */
  async pickDocument(): Promise<MediaFile | null> {
    // Web doesn't support document picker - disable for now
    if (Platform.OS === 'web') {
      throw new Error('Document picker not available on web. Please use the mobile app.');
    }

    try {
      const result = await pick({
        type: [types.pdf],
      });

      if (!result || result.length === 0) {
        return null;
      }

      const file = result[0];
      console.log('PDF picker result:', JSON.stringify(file, null, 2));

      // Validate file size
      if (file.size && file.size > MAX_PDF_SIZE) {
        throw new Error(`PDF size exceeds maximum of ${MAX_PDF_SIZE / 1024 / 1024}MB`);
      }

      // Copy file to local app storage for persistent access
      // This ensures FormData can access the file for upload
      const localCopies = await keepLocalCopy({
        files: [{uri: file.uri, fileName: file.name || 'document.pdf'}],
        destination: 'documentDirectory',
      });

      const localFile = localCopies[0];
      console.log('Local copy created:', JSON.stringify(localFile, null, 2));

      return {
        uri: localFile.localUri, // keepLocalCopy returns 'localUri' not 'uri'
        type: file.type || 'application/pdf',
        name: file.name || 'document.pdf',
        size: file.size || 0,
      };
    } catch (err: any) {
      console.error('PDF picker error:', err);
      // User cancellation returns empty result in new API
      if (Array.isArray(err) && err.length === 0) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Pick images from gallery
   */
  async pickImages(multiple: boolean = false): Promise<MediaFile[]> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: multiple ? 0 : 1,
        quality: 0.8,
      });

      if (result.didCancel || !result.assets) {
        return [];
      }

      return result.assets.map((asset: Asset) => {
        // Validate file size
        if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
          throw new Error(`Image size exceeds maximum of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        }

        return {
          uri: asset.uri || '',
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'image.jpg',
          size: asset.fileSize || 0,
        };
      });
    } catch (err) {
      throw err;
    }
  },

  /**
   * Take a photo with camera
   */
  async takePhoto(): Promise<MediaFile | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Validate file size
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        throw new Error(`Image size exceeds maximum of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      }

      return {
        uri: asset.uri || '',
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'photo.jpg',
        size: asset.fileSize || 0,
      };
    } catch (err) {
      throw err;
    }
  },

  /**
   * Pick a video from gallery
   */
  async pickVideo(): Promise<MediaFile | null> {
    try {
      console.log('Launching video picker...');
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
      });

      console.log('Video picker result:', JSON.stringify(result, null, 2));

      if (result.didCancel) {
        console.log('User cancelled video picker');
        return null;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('No video assets returned');
        return null;
      }

      const asset = result.assets[0];
      console.log('Video asset:', JSON.stringify(asset, null, 2));

      // Validate file size (60MB for ~1 min video)
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
        throw new Error(
          `Video size exceeds maximum of ${MAX_VIDEO_SIZE / 1024 / 1024}MB (approx 1 min)`,
        );
      }

      const mediaFile = {
        uri: asset.uri || '',
        type: asset.type || 'video/mp4',
        name: asset.fileName || 'video.mp4',
        size: asset.fileSize || 0,
      };

      console.log('Returning video file:', JSON.stringify(mediaFile, null, 2));
      return mediaFile;
    } catch (err) {
      console.error('Video picker error:', err);
      throw err;
    }
  },

  /**
   * Record a video with camera
   */
  async recordVideo(): Promise<MediaFile | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    try {
      const result = await launchCamera({
        mediaType: 'video',
        videoQuality: 'medium',
        durationLimit: 60, // 1 minute max
        saveToPhotos: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Validate file size
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
        throw new Error(
          `Video size exceeds maximum of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
        );
      }

      return {
        uri: asset.uri || '',
        type: asset.type || 'video/mp4',
        name: asset.fileName || 'video.mp4',
        size: asset.fileSize || 0,
      };
    } catch (err) {
      throw err;
    }
  },

  /**
   * Convert file to base64 (for small files only)
   */
  async fileToBase64(uri: string): Promise<string> {
    const RNFS = require('react-native-fs');
    const base64 = await RNFS.readFile(uri, 'base64');
    return base64;
  },

  /**
   * Validate file type
   */
  isValidFileType(type: string): boolean {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'video/mp4',
      'video/quicktime',
    ];
    return validTypes.includes(type.toLowerCase());
  },

  /**
   * Get file extension from type
   */
  getFileExtension(type: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    };
    return typeMap[type.toLowerCase()] || 'unknown';
  },
};
