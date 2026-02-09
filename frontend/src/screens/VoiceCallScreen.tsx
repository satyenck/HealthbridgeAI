import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {VoiceRecorder} from '../components/VoiceRecorder';
import {voiceService, RecordingResult} from '../services/voiceService';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

interface VoiceCallScreenProps {
  route: {
    params: {
      encounterId: string;
      isDoctorConsultation?: boolean;
      patientName?: string;
    };
  };
  navigation: any;
}

export const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({
  route,
  navigation,
}) => {
  const {encounterId, isDoctorConsultation, patientName} = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleRecordingComplete = async (result: RecordingResult) => {
    try {
      setIsProcessing(true);

      // Convert audio to base64
      const audioBase64 = await voiceService.audioToBase64(result.uri);

      // Navigate to appropriate review screen
      if (isDoctorConsultation) {
        // Doctor-initiated consultation - generate complete summary report
        navigation.replace('DoctorConsultationReview', {
          encounterId,
          audioBase64,
          patientName: patientName || 'Patient',
          language: selectedLanguage,
        });
      } else {
        // Regular call review for updating existing reports
        navigation.replace('CallReview', {
          encounterId,
          audioBase64,
          recordingUri: result.uri,
          language: selectedLanguage,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process recording');
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Consultation',
      'Are you sure you want to cancel this voice consultation?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Consultation</Text>
        <View style={{width: 24}} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Language Selector */}
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={() => setShowLanguageModal(true)}>
          <Icon name="language" size={24} color="#00ACC1" />
          <View style={styles.languageInfo}>
            <Text style={styles.languageLabel}>Language</Text>
            <Text style={styles.languageName}>
              {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Icon name="info-outline" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            Record your consultation conversation. The app will transcribe and
            extract medical information for review.
          </Text>
        </View>

        <View style={styles.recorderContainer}>
          <Text style={styles.instructionTitle}>
            Record Consultation
          </Text>
          <Text style={styles.instructionSubtitle}>
            Discuss symptoms, diagnosis, and treatment plan
          </Text>

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#00ACC1" />
              <Text style={styles.processingText}>Processing recording...</Text>
            </View>
          ) : (
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={(error) => Alert.alert('Error', error.message)}
            />
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for best results:</Text>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color="#00ACC1" />
            <Text style={styles.tipText}>Speak clearly and naturally</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color="#00ACC1" />
            <Text style={styles.tipText}>
              Mention key medical information explicitly
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color="#00ACC1" />
            <Text style={styles.tipText}>
              Review and edit extracted data afterwards
            </Text>
          </View>
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === language.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedLanguage(language.code);
                    setShowLanguageModal(false);
                  }}>
                  <View>
                    <Text style={styles.languageOptionName}>{language.nativeName}</Text>
                    <Text style={styles.languageOptionSubname}>{language.name}</Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <Icon name="check-circle" size={24} color="#00ACC1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#00ACC1',
  },
  cancelButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  languageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
  recorderContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  instructionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  processingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  languageOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  languageOptionSubname: {
    fontSize: 13,
    color: '#666',
  },
});
