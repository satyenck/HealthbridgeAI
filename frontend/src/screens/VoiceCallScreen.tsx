import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {VoiceRecorder} from '../components/VoiceRecorder';
import {voiceService, RecordingResult} from '../services/voiceService';

interface VoiceCallScreenProps {
  route: {
    params: {
      encounterId: string;
    };
  };
  navigation: any;
}

export const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({
  route,
  navigation,
}) => {
  const {encounterId} = route.params;
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = async (result: RecordingResult) => {
    try {
      setIsProcessing(true);

      // Convert audio to base64
      const audioBase64 = await voiceService.audioToBase64(result.uri);

      // Navigate to review screen with recording
      navigation.replace('CallReview', {
        encounterId,
        audioBase64,
        recordingUri: result.uri,
      });
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
              <ActivityIndicator size="large" color="#4CAF50" />
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
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Speak clearly and naturally</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>
              Mention key medical information explicitly
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>
              Review and edit extracted data afterwards
            </Text>
          </View>
        </View>
      </View>
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
    backgroundColor: '#4CAF50',
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
});
