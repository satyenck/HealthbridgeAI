/**
 * File handling utilities for media uploads
 */

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/x-m4v'],
  PDF: ['application/pdf'],
};

/**
 * Max file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  VIDEO: 60 * 1024 * 1024, // 60 MB (~1 min video)
  PDF: 20 * 1024 * 1024, // 20 MB
};

/**
 * Check if file type is supported
 */
export const isSupportedFileType = (mimeType: string): boolean => {
  return Object.values(SUPPORTED_FILE_TYPES).some(types => types.includes(mimeType.toLowerCase()));
};

/**
 * Get file category from MIME type
 */
export const getFileCategory = (mimeType: string): 'image' | 'video' | 'pdf' | 'unknown' => {
  const type = mimeType.toLowerCase();
  if (SUPPORTED_FILE_TYPES.IMAGE.includes(type)) return 'image';
  if (SUPPORTED_FILE_TYPES.VIDEO.includes(type)) return 'video';
  if (SUPPORTED_FILE_TYPES.PDF.includes(type)) return 'pdf';
  return 'unknown';
};

/**
 * Validate file size based on type
 */
export const isValidFileSize = (mimeType: string, sizeInBytes: number): boolean => {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'image':
      return sizeInBytes <= MAX_FILE_SIZES.IMAGE;
    case 'video':
      return sizeInBytes <= MAX_FILE_SIZES.VIDEO;
    case 'pdf':
      return sizeInBytes <= MAX_FILE_SIZES.PDF;
    default:
      return false;
  }
};

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get max file size for a category
 */
export const getMaxFileSize = (mimeType: string): {bytes: number; formatted: string} => {
  const category = getFileCategory(mimeType);
  let bytes = 0;

  switch (category) {
    case 'image':
      bytes = MAX_FILE_SIZES.IMAGE;
      break;
    case 'video':
      bytes = MAX_FILE_SIZES.VIDEO;
      break;
    case 'pdf':
      bytes = MAX_FILE_SIZES.PDF;
      break;
  }

  return {
    bytes,
    formatted: formatFileSize(bytes),
  };
};

/**
 * Convert file to base64
 */
export const fileToBase64 = async (uri: string): Promise<string> => {
  const RNFS = require('react-native-fs');
  try {
    const base64 = await RNFS.readFile(uri, 'base64');
    return base64;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw new Error('Failed to convert file to base64');
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Get MIME type from file extension
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const ext = extension.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    pdf: 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Validate file
 */
export const validateFile = (
  mimeType: string,
  sizeInBytes: number,
): {valid: boolean; error?: string} => {
  // Check if file type is supported
  if (!isSupportedFileType(mimeType)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload JPG, PNG, PDF, or MP4 files only.',
    };
  }

  // Check file size
  if (!isValidFileSize(mimeType, sizeInBytes)) {
    const maxSize = getMaxFileSize(mimeType);
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize.formatted}`,
    };
  }

  return {valid: true};
};

/**
 * Get file type icon name (for react-native-vector-icons)
 */
export const getFileTypeIcon = (mimeType: string): {name: string; type: string} => {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'image':
      return {name: 'image', type: 'MaterialIcons'};
    case 'video':
      return {name: 'videocam', type: 'MaterialIcons'};
    case 'pdf':
      return {name: 'picture-as-pdf', type: 'MaterialIcons'};
    default:
      return {name: 'insert-drive-file', type: 'MaterialIcons'};
  }
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const extension = getFileExtension(originalFilename);
  const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
  return `${nameWithoutExt}_${timestamp}.${extension}`;
};

/**
 * Check if file exists
 */
export const fileExists = async (uri: string): Promise<boolean> => {
  const RNFS = require('react-native-fs');
  try {
    return await RNFS.exists(uri);
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

/**
 * Delete file
 */
export const deleteFile = async (uri: string): Promise<void> => {
  const RNFS = require('react-native-fs');
  try {
    const exists = await RNFS.exists(uri);
    if (exists) {
      await RNFS.unlink(uri);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Get file info
 */
export const getFileInfo = async (
  uri: string,
): Promise<{size: number; filename: string; exists: boolean}> => {
  const RNFS = require('react-native-fs');
  try {
    const exists = await RNFS.exists(uri);
    if (!exists) {
      return {size: 0, filename: '', exists: false};
    }

    const stat = await RNFS.stat(uri);
    const filename = uri.split('/').pop() || 'unknown';

    return {
      size: stat.size,
      filename,
      exists: true,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return {size: 0, filename: '', exists: false};
  }
};
