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

interface VitalsReportScreenProps {
  navigation: any;
}

export const VitalsReportScreen: React.FC<VitalsReportScreenProps> = ({
  navigation,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{role: 'assistant' | 'user'; message: string}>
  >([
    {
      role: 'assistant',
      message:
        "Hi! I'm your Health Assistant. Tell me about your vital signs like blood pressure, weight, temperature, or blood sugar. You can also mention when you measured them, like 'today' or 'yesterday'.",
    },
  ]);

  // AudioRecorderPlayer is a singleton instance, use it directly

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      AudioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
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
        await processVitalReport(result);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
      setIsRecording(false);
    }
  };

  const processVitalReport = async (audioPath: string) => {
    try {
      setIsProcessing(true);

      // Read audio file and convert to base64
      const RNFS = require('react-native-fs');
      const audioBase64 = await RNFS.readFile(audioPath, 'base64');

      // Get auth token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'You must be logged in to report vitals');
        return;
      }

      // Call health assistant API
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH_ASSISTANT_REPORT_VITALS}`,
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

      // Show what the patient said (transcription)
      if (data.transcribed_text) {
        setConversation(prev => [
          ...prev,
          {role: 'user', message: data.transcribed_text},
        ]);
      }

      if (data.needs_clarification) {
        // AI needs more information
        setConversation(prev => [
          ...prev,
          {role: 'assistant', message: data.clarification_question},
        ]);
      } else {
        // Vitals saved successfully
        const confirmationMsg =
          data.confirmation_message || 'Your vitals have been recorded!';

        setConversation(prev => [
          ...prev,
          {role: 'assistant', message: confirmationMsg},
        ]);

        // Show success with details
        if (data.vitals_saved && data.vitals_saved.length > 0) {
          const vitalsSummary = data.vitals_saved
            .map((v: any) => {
              const measurements = Object.entries(v.measurements)
                .filter(([_, value]) => value !== null)
                .map(([key, value]) => {
                  // Format key to be more readable
                  const formattedKey = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  return `${formattedKey}: ${value}`;
                })
                .join('\n');
              return `Date: ${v.date}\n${measurements}`;
            })
            .join('\n\n');

          Alert.alert('Vitals Saved Successfully!', vitalsSummary, [
            {text: 'Add More', onPress: () => {}},
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Failed to process vitals:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process your vitals. Please try again.',
      );

      setConversation(prev => [
        ...prev,
        {
          role: 'assistant',
          message:
            "I'm sorry, I had trouble processing that. Could you try again?",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Conversation */}
      <ScrollView
        style={styles.conversation}
        contentContainerStyle={styles.conversationContent}>
        {conversation.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              msg.role === 'assistant'
                ? styles.assistantBubble
                : styles.userBubble,
            ]}>
            <Text
              style={[
                styles.messageText,
                msg.role === 'assistant'
                  ? styles.assistantText
                  : styles.userText,
              ]}>
              {msg.message}
            </Text>
          </View>
        ))}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Voice Recording Button */}
      <View style={styles.recordingArea}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}>
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.recordingHint}>
          {isRecording
            ? 'Tap to stop recording'
            : 'Tap to start recording'}
        </Text>

        {/* Examples */}
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Try saying:</Text>
          <Text style={styles.exampleText}>
            • "My blood pressure was 120/80 this morning"
          </Text>
          <Text style={styles.exampleText}>
            • "I weighed 75 kg yesterday"
          </Text>
          <Text style={styles.exampleText}>
            • "My blood sugar is 110 today"
          </Text>
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
  conversation: {
    flex: 1,
  },
  conversationContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  assistantBubble: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  assistantText: {
    color: '#1B5E20',
  },
  userText: {
    color: '#fff',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#1B5E20',
    marginLeft: 8,
  },
  recordingArea: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  examplesContainer: {
    marginTop: 24,
    width: '100%',
  },
  examplesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
});
