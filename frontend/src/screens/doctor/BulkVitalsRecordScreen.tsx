import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, API_ENDPOINTS} from '../../config/api';

interface BulkVitalsRecordScreenProps {
  navigation: any;
}

interface PatientVitalsResult {
  phone_number: string;
  patient_name?: string;
  vitals_saved: any;
  success: boolean;
  error?: string;
}

export const BulkVitalsRecordScreen: React.FC<BulkVitalsRecordScreenProps> = ({
  navigation,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [results, setResults] = useState<PatientVitalsResult[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // AudioRecorderPlayer is a singleton instance, use it directly

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      AudioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setTranscription('');
      setResults([]);
      setRecordingDuration(0);
      await AudioRecorderPlayer.startRecorder();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await AudioRecorderPlayer.stopRecorder();
      setIsRecording(false);

      if (result) {
        await processBulkVitals(result);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
      setIsRecording(false);
    }
  };

  const processBulkVitals = async (audioPath: string) => {
    try {
      setIsProcessing(true);

      // Read audio file and convert to base64
      const RNFS = require('react-native-fs');
      const audioBase64 = await RNFS.readFile(audioPath, 'base64');

      // Get auth token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'You must be logged in to record vitals');
        return;
      }

      // Call bulk vitals API
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.BULK_VITALS_RECORD}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            audio_base64: audioBase64,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process vitals');
      }

      // Show transcription
      if (data.transcribed_text) {
        setTranscription(data.transcribed_text);
      }

      // Show results
      if (data.results && data.results.length > 0) {
        setResults(data.results);

        const successCount = data.results.filter((r: any) => r.success).length;
        const failCount = data.results.length - successCount;

        Alert.alert(
          'Vitals Recorded',
          `Successfully recorded vitals for ${successCount} patient(s).${
            failCount > 0 ? `\n${failCount} failed.` : ''
          }`,
        );
      } else {
        Alert.alert('No Data', 'No patient vitals were found in the recording');
      }
    } catch (error: any) {
      console.error('Failed to process bulk vitals:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process vitals. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Icon name="info" size={24} color="#0277BD" />
          <View style={styles.instructionsText}>
            <Text style={styles.instructionsTitle}>How to use:</Text>
            <Text style={styles.instructionStep}>
              1. Press the record button below
            </Text>
            <Text style={styles.instructionStep}>
              2. Speak patient vitals with phone numbers
            </Text>
            <Text style={styles.instructionStep}>
              3. Press stop when done
            </Text>
          </View>
        </View>

        {/* Example */}
        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Example:</Text>
          <Text style={styles.exampleText}>
            "5106880096's blood pressure is 130 and 85. RBC count is 4.9, WBC
            count is 3. 1234567890's blood pressure is 135 and 90. Sodium level
            is 140."
          </Text>
        </View>

        {/* Record Button */}
        <View style={styles.recordSection}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            activeOpacity={0.7}>
            {isProcessing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.recordButtonInner}>
                <Text style={styles.recordIcon}>
                  {isRecording ? '⏹' : '🎤'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingInfo}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording</Text>
              </View>
              <Text style={styles.duration}>{recordingDuration}s</Text>
            </View>
          )}

          {!isRecording && !isProcessing && (
            <Text style={styles.instruction}>
              Tap to start recording
            </Text>
          )}
        </View>

        {/* Transcription */}
        {transcription && (
          <View style={styles.transcriptionCard}>
            <Text style={styles.transcriptionTitle}>Transcription:</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Results</Text>
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultCard,
                  result.success ? styles.resultSuccess : styles.resultError,
                ]}>
                <View style={styles.resultHeader}>
                  <Icon
                    name={result.success ? 'check-circle' : 'error'}
                    size={24}
                    color={result.success ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={styles.resultPhone}>{result.phone_number}</Text>
                </View>
                {result.patient_name && (
                  <Text style={styles.resultName}>{result.patient_name}</Text>
                )}
                {result.success ? (
                  <Text style={styles.resultMessage}>
                    ✓ Vitals recorded successfully
                  </Text>
                ) : (
                  <Text style={styles.resultErrorText}>
                    ✗ {result.error || 'Failed to record vitals'}
                  </Text>
                )}
              </View>
            ))}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E1F5FE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#01579B',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: '#0277BD',
    marginBottom: 4,
  },
  exampleCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#F9A825',
    lineHeight: 20,
  },
  recordSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    fontSize: 48,
  },
  recordingInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
  duration: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  instruction: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  transcriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0277BD',
  },
  transcriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  resultsSection: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  resultSuccess: {
    borderLeftColor: '#4CAF50',
  },
  resultError: {
    borderLeftColor: '#F44336',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultPhone: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  resultName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resultErrorText: {
    fontSize: 14,
    color: '#F44336',
  },
});
