import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {mediaService, MediaFile} from '../services/mediaService';

interface MediaPickerProps {
  onFilesSelected: (files: MediaFile[]) => void;
  allowMultiple?: boolean;
  fileTypes?: ('image' | 'video' | 'pdf')[];
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onFilesSelected,
  allowMultiple = false,
  fileTypes = ['image', 'video', 'pdf'],
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePickDocument = async () => {
    try {
      setIsLoading(true);
      const file = await mediaService.pickDocument();
      if (file) {
        onFilesSelected([file]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick document');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImages = async () => {
    try {
      setIsLoading(true);
      const files = await mediaService.pickImages(allowMultiple);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      const file = await mediaService.takePhoto();
      if (file) {
        onFilesSelected([file]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickVideo = async () => {
    try {
      setIsLoading(true);
      const file = await mediaService.pickVideo();
      if (file) {
        onFilesSelected([file]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordVideo = async () => {
    try {
      setIsLoading(true);
      const file = await mediaService.recordVideo();
      if (file) {
        onFilesSelected([file]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Files</Text>

      <View style={styles.buttonGrid}>
        {fileTypes.includes('pdf') && (
          <TouchableOpacity
            style={styles.button}
            onPress={handlePickDocument}
            disabled={isLoading}>
            <Text style={styles.buttonIcon}>📄</Text>
            <Text style={styles.buttonText}>PDF Document</Text>
          </TouchableOpacity>
        )}

        {fileTypes.includes('image') && (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePickImages}
              disabled={isLoading}>
              <Text style={styles.buttonIcon}>🖼️</Text>
              <Text style={styles.buttonText}>
                {allowMultiple ? 'Images' : 'Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleTakePhoto}
              disabled={isLoading}>
              <Text style={styles.buttonIcon}>📷</Text>
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
          </>
        )}

        {fileTypes.includes('video') && (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePickVideo}
              disabled={isLoading}>
              <Text style={styles.buttonIcon}>🎥</Text>
              <Text style={styles.buttonText}>Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRecordVideo}
              disabled={isLoading}>
              <Text style={styles.buttonIcon}>📹</Text>
              <Text style={styles.buttonText}>Record Video</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.hint}>
        Max sizes: Images 10MB, Videos 60MB (~1 min), PDFs 20MB
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
