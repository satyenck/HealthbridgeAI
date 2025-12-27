import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {consultationService} from '../services/consultationService';
import {VoiceRecorder} from '../components/VoiceRecorder';
import {voiceService, RecordingResult} from '../services/voiceService';

export const NewConsultationScreen = ({navigation}: any) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your health issue');
      return;
    }

    setLoading(true);
    try {
      const consultation = await consultationService.createConsultation({
        patient_description: description,
      });

      Alert.alert('Success', 'Consultation report generated', [
        {
          text: 'View Report',
          onPress: () => {
            navigation.replace('ConsultationDetail', {consultation});
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to create consultation',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    setShowVoiceModal(true);
  };

  const handleRecordingComplete = async (result: RecordingResult) => {
    setShowVoiceModal(false);
    setIsTranscribing(true);

    try {
      // Transcribe the audio using OpenAI Whisper
      const transcription = await voiceService.transcribeAudio(result.audioBase64);

      // Set the transcribed text as the description
      setDescription(transcription);

      Alert.alert(
        'Success',
        'Your symptoms have been transcribed. You can review and edit before submitting.',
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        'Failed to transcribe audio. Please try again or type your symptoms manually.',
      );
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRecordingError = (error: Error) => {
    setShowVoiceModal(false);
    Alert.alert('Recording Error', error.message);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Consultation</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Describe your symptoms or health concerns in detail. Our AI will
            analyze and provide insights about:
          </Text>
          <Text style={styles.bulletPoint}>• Potential symptoms</Text>
          <Text style={styles.bulletPoint}>• Possible diagnoses</Text>
          <Text style={styles.bulletPoint}>• Treatment recommendations</Text>
          <Text style={styles.bulletPoint}>• Next steps to take</Text>
        </View>

        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceInput}
          disabled={isTranscribing || loading}>
          {isTranscribing ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <ActivityIndicator color="#fff" style={{marginRight: 10}} />
              <Text style={styles.voiceButtonText}>Transcribing...</Text>
            </View>
          ) : (
            <Text style={styles.voiceButtonText}>🎤 Use Voice Input</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Describe Your Health Issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Example: I've been experiencing headaches for the past 3 days, mostly in the morning. I also feel nauseous and have trouble concentrating..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ This is not a substitute for professional medical advice. Please
            consult a healthcare provider for proper diagnosis and treatment.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Generate Consultation Report
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVoiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Your Symptoms</Text>
            <Text style={styles.modalSubtitle}>
              Tap the microphone to start recording. Speak clearly and describe
              all your symptoms.
            </Text>

            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={handleRecordingError}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowVoiceModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 12,
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
    lineHeight: 20,
  },
  voiceButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 20,
  },
  disclaimerBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});
