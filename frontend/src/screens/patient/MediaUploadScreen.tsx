import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {MediaPicker} from '../../components/MediaPicker';
import {MediaFile, mediaService} from '../../services/mediaService';
import {encounterService} from '../../services/encounterService';
import {formatFileSize} from '../../utils/fileHelpers';

export const MediaUploadScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (files: MediaFile[]) => {
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files', 'Please select files to upload');
      return;
    }

    try {
      setUploading(true);

      await encounterService.uploadMedia(encounterId, selectedFiles);

      Alert.alert('Success', 'Files uploaded successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Files</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.instructionBox}>
          <Icon name="info" size={24} color="#2196F3" />
          <Text style={styles.instructionText}>
            Upload medical records, lab reports, images, or videos related to this encounter.
          </Text>
        </View>

        <MediaPicker
          onFilesSelected={handleFilesSelected}
          allowMultiple={true}
          fileTypes={['image', 'video', 'pdf']}
        />

        {selectedFiles.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>
              Selected Files ({selectedFiles.length})
            </Text>

            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileCard}>
                <View style={styles.fileInfo}>
                  <Icon
                    name={getFileIcon(file.type)}
                    size={32}
                    color="#2196F3"
                  />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {formatFileSize(file.size)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                  <Icon name="close" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedFiles.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
            disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'videocam';
  if (type === 'application/pdf') return 'picture-as-pdf';
  return 'insert-drive-file';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  instructionBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  selectedSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
