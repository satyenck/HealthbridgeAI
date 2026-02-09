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
import {VoiceRecorder} from '../../components/VoiceRecorder';
import {voiceService, RecordingResult} from '../../services/voiceService';
import {encounterService} from '../../services/encounterService';

export const VoiceRecordScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  const handleRecordingComplete = (result: RecordingResult) => {
    setRecording(result);
  };

  const handleError = (error: Error) => {
    Alert.alert('Recording Error', error.message);
  };

  const handleProcess = async () => {
    if (!recording) {
      Alert.alert('Error', 'No recording available');
      return;
    }

    try {
      setProcessing(true);

      // Convert to base64
      const audioBase64 = await voiceService.audioToBase64(recording.uri);

      // Process voice encounter (transcribe + generate summary)
      const result = await encounterService.processVoiceEncounter(
        encounterId,
        audioBase64,
      );

      setTranscription(result.transcription.transcribed_text);
      setSummaryGenerated(true);

      Alert.alert(
        'Success',
        'Voice processed and summary generated successfully!',
        [
          {
            text: 'View Encounter',
            onPress: () => navigation.replace('EncounterDetail', {encounterId}),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process voice');
    } finally {
      setProcessing(false);
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
        <Text style={styles.title}>Voice Recording</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.instructionBox}>
          <Icon name="info" size={24} color="#2196F3" />
          <Text style={styles.instructionText}>
            Describe your symptoms, how you're feeling, and any health concerns. Speak naturally and clearly.
          </Text>
        </View>

        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onError={handleError}
        />

        {recording && !summaryGenerated && (
          <View style={styles.recordingInfo}>
            <Icon name="check-circle" size={48} color="#00ACC1" />
            <Text style={styles.recordingSuccessText}>Recording Complete!</Text>
            <Text style={styles.recordingDetails}>
              Duration: {Math.floor(recording.duration / 1000)}s
            </Text>

            <TouchableOpacity
              style={styles.processButton}
              onPress={handleProcess}
              disabled={processing}>
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#fff" />
                  <Text style={styles.processButtonText}>
                    Generate AI Summary
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.processingText}>
              Transcribing audio and generating summary...
            </Text>
          </View>
        )}

        {transcription && (
          <View style={styles.transcriptionBox}>
            <Text style={styles.transcriptionTitle}>Transcription:</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
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
    marginBottom: 32,
  },
  instructionText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  recordingInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  recordingSuccessText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ACC1',
    marginTop: 16,
  },
  recordingDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  processButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  processingBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  processingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  transcriptionBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
