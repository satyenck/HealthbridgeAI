import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
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
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text'); // Default to text mode
  const [conversation, setConversation] = useState<
    Array<{role: 'assistant' | 'user'; message: string}>
  >([
    {
      role: 'assistant',
      message:
        "Hi! I'm your Health Assistant. Tell me about your vital signs like blood pressure, weight, temperature, or blood sugar. You can type or use voice input.",
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      AudioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record vitals',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  const startRecording = async () => {
    try {
      // Request permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio');
        return;
      }

      setIsRecording(true);
      await AudioRecorderPlayer.startRecorder();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Make sure microphone permissions are granted.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await AudioRecorderPlayer.stopRecorder();
      setIsRecording(false);

      if (result) {
        await processVitalReportVoice(result);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
      setIsRecording(false);
    }
  };

  const sendTextVitals = async () => {
    if (!textInput.trim()) {
      return;
    }

    const userMessage = textInput.trim();
    setTextInput('');

    // Add user message to conversation
    setConversation(prev => [
      ...prev,
      {role: 'user', message: userMessage},
    ]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({animated: true});
    }, 100);

    await processVitalReportText(userMessage);
  };

  const processVitalReportVoice = async (audioPath: string) => {
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

      // Process response
      await handleVitalsResponse(data, data.transcribed_text);
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

  const processVitalReportText = async (text: string) => {
    try {
      setIsProcessing(true);

      // Get auth token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'You must be logged in to report vitals');
        return;
      }

      // Call health assistant API with text instead of audio
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.HEALTH_ASSISTANT_REPORT_VITALS}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text_input: text,
          }),
        },
      );

      const data = await response.json();

      // Process response
      await handleVitalsResponse(data, null);
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

  const handleVitalsResponse = async (data: any, transcribedText: string | null) => {
    try {

      // Show what the patient said (transcription from voice, if available)
      if (transcribedText) {
        setConversation(prev => [
          ...prev,
          {role: 'user', message: transcribedText},
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

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error: any) {
      console.error('Failed to handle vitals response:', error);
      throw error;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Conversation */}
      <ScrollView
        ref={scrollViewRef}
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
            <ActivityIndicator size="small" color="#00ACC1" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'text' && styles.modeButtonActive,
            ]}
            onPress={() => setInputMode('text')}>
            <Icon name="keyboard" size={20} color={inputMode === 'text' ? '#00ACC1' : '#999'} />
            <Text style={[styles.modeText, inputMode === 'text' && styles.modeTextActive]}>
              Type
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'voice' && styles.modeButtonActive,
            ]}
            onPress={() => setInputMode('voice')}>
            <Icon name="mic" size={20} color={inputMode === 'voice' ? '#00ACC1' : '#999'} />
            <Text style={[styles.modeText, inputMode === 'voice' && styles.modeTextActive]}>
              Voice
            </Text>
          </TouchableOpacity>
        </View>

        {inputMode === 'text' ? (
          /* Text Input Mode */
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your vitals (e.g., BP 120/80, Weight 75kg)"
              value={textInput}
              onChangeText={setTextInput}
              multiline
              maxLength={500}
              editable={!isProcessing}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!textInput.trim() || isProcessing) && styles.sendButtonDisabled,
              ]}
              onPress={sendTextVitals}
              disabled={!textInput.trim() || isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Voice Input Mode */
          <View style={styles.voiceInputContainer}>
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
          </View>
        )}

        {/* Examples */}
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Examples:</Text>
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
    </KeyboardAvoidingView>
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
    backgroundColor: '#00ACC1',
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
  inputArea: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#00ACC1',
    fontWeight: '600',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00ACC1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  voiceInputContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00ACC1',
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
