/**
 * PatientDocumentsScreen
 *
 * Allows patients to upload and manage medical documents
 * (lab reports, MRI scans, prescriptions, etc.) that are accessible to all doctors
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MediaPicker} from '../../components/MediaPicker';
import {MediaFile} from '../../services/mediaService';
import apiService from '../../services/apiService';
import {formatFileSize} from '../../utils/fileHelpers';
import {format, parseISO} from 'date-fns';
import {API_CONFIG} from '../../config/api';

interface PatientDocument {
  file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  file_url: string;
}

export const PatientDocumentsScreen = ({navigation}: any) => {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // Get documents from patient profile
      const response = await apiService.get('/api/profile/documents');
      setDocuments(response || []);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      // If endpoint doesn't exist yet or returns 404, just show empty
      if (error.response?.status === 404 || error.response?.status === 501) {
        setDocuments([]);
      } else {
        Alert.alert('Error', 'Failed to load documents');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

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

      // Get auth token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Prepare multipart form data for react-native-blob-util
      const multipartData = selectedFiles.map((file) => {
        if (!file.uri) {
          throw new Error(`File ${file.name} has no URI`);
        }

        // Remove file:// prefix if present
        const filePath = file.uri.replace('file://', '');

        return {
          name: 'files',
          filename: file.name,
          type: file.type,
          data: ReactNativeBlobUtil.wrap(filePath),
        };
      });

      console.log('Uploading files with blob-util:', selectedFiles.map(f => f.name));

      // Use ReactNativeBlobUtil for file upload (works correctly on Android)
      const response = await ReactNativeBlobUtil.fetch(
        'POST',
        `${API_CONFIG.BASE_URL}/api/profile/documents/upload`,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        multipartData
      );

      const responseData = response.json();
      console.log('Upload response:', responseData);

      if (response.respInfo.status === 200) {
        Alert.alert('Success', 'Documents uploaded successfully');
        setSelectedFiles([]);
        setShowUploadSection(false);
        await loadDocuments();
      } else {
        throw new Error(responseData.detail || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Failed to upload documents:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to upload documents'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (doc: PatientDocument) => {
    try {
      if (Platform.OS === 'web') {
        window.open(doc.file_url, '_blank');
      } else {
        await Linking.openURL(doc.file_url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleDeleteDocument = (doc: PatientDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete ${doc.file_name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/api/profile/documents/${doc.file_id}`);
              Alert.alert('Success', 'Document deleted');
              await loadDocuments();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type === 'application/pdf') return 'picture-as-pdf';
    return 'insert-drive-file';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#00ACC1']} />
        }>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="info" size={20} color="#00695C" />
          <Text style={styles.infoText}>
            Upload lab reports, MRI scans, prescriptions, and other medical documents. These will be accessible to all doctors treating you.
          </Text>
        </View>

        {/* Upload Section */}
        {!showUploadSection ? (
          <TouchableOpacity
            style={styles.uploadPromptCard}
            onPress={() => setShowUploadSection(true)}>
            <Icon name="cloud-upload" size={48} color="#00ACC1" />
            <Text style={styles.uploadPromptTitle}>Upload New Documents</Text>
            <Text style={styles.uploadPromptSubtitle}>
              Tap to add lab reports, scans, or medical records
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.uploadSection}>
            <View style={styles.uploadHeader}>
              <Text style={styles.uploadTitle}>Upload Documents</Text>
              <TouchableOpacity onPress={() => {
                setShowUploadSection(false);
                setSelectedFiles([]);
              }}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <MediaPicker
              onFilesSelected={handleFilesSelected}
              allowMultiple={true}
              fileTypes={['image', 'video', 'pdf']}
            />

            {selectedFiles.length > 0 && (
              <View style={styles.selectedFilesSection}>
                <Text style={styles.selectedFilesTitle}>
                  Selected Files ({selectedFiles.length})
                </Text>

                {selectedFiles.map((file, index) => (
                  <View key={index} style={styles.fileCard}>
                    <View style={styles.fileInfo}>
                      <Icon name={getFileIcon(file.type)} size={32} color="#2196F3" />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                      <Icon name="close" size={24} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}

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
        )}

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>
            My Documents ({documents.length})
          </Text>

          {documents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No documents uploaded yet</Text>
              <Text style={styles.emptySubtext}>
                Upload your medical records, lab reports, and scans
              </Text>
            </View>
          ) : (
            documents.map((doc) => (
              <View key={doc.file_id} style={styles.documentCard}>
                <TouchableOpacity
                  style={styles.documentInfo}
                  onPress={() => handleViewDocument(doc)}>
                  <Icon name={getFileIcon(doc.file_type)} size={40} color="#2196F3" />
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {doc.file_name}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {formatFileSize(doc.file_size)} • {format(parseISO(doc.uploaded_at), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.documentActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewDocument(doc)}>
                    <Icon name="visibility" size={24} color="#00ACC1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteDocument(doc)}>
                    <Icon name="delete" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  uploadPromptCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  uploadPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  uploadPromptSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedFilesSection: {
    marginTop: 16,
  },
  selectedFilesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  fileCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  uploadButton: {
    backgroundColor: '#00ACC1',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  documentsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
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
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#999',
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});

export default PatientDocumentsScreen;
