import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tts from 'react-native-tts';
import {VoiceRecorder} from '../../components/VoiceRecorder';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';
import {encounterService} from '../../services/encounterService';
import {authService} from '../../services/authService';
import {voiceService, RecordingResult} from '../../services/voiceService';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export const HealthAssistantScreen = ({navigation}: any) => {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [loading, setLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [editedSummary, setEditedSummary] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'gu' | 'hi'>('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Cleanup TTS on unmount
    return () => {
      (async () => {
        try {
          await Tts.stop();
        } catch (error) {
          // Ignore TTS cleanup errors
        }
      })();
    };
  }, []);

  useEffect(() => {
    // Initialize TTS when language changes
    initializeTts();
  }, [selectedLanguage]);

  const initializeTts = async () => {
    try {
      // Map language code to TTS language
      const ttsLanguage = {
        'en': 'en-US',
        'gu': 'gu-IN',
        'hi': 'hi-IN',
      }[selectedLanguage];

      // Set language
      await Tts.setDefaultLanguage(ttsLanguage);

      // Initialize TTS engine
      await Tts.getInitStatus();

      // Set default voice settings
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
    } catch (error) {
      console.log('TTS initialization:', error);
      // TTS might not be available, but we can continue without it
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when conversation updates
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, [conversationHistory, currentQuestion]);

  useEffect(() => {
    // Speak the question when in voice mode and a new question arrives
    if (inputMode === 'voice' && currentQuestion && !loading) {
      (async () => {
        await speakQuestion(currentQuestion);
      })();
    }
  }, [currentQuestion, inputMode, loading]);

  const speakQuestion = async (text: string) => {
    try {
      // Stop any ongoing speech
      try {
        await Tts.stop();
      } catch (e) {
        // Ignore stop errors
      }

      // Check if TTS is available and voices are installed
      const voices = await Tts.voices();
      if (!voices || voices.length === 0) {
        console.log('No TTS voices available');
        return;
      }

      // Speak the new question with simplified options
      await Tts.speak(text, {
        androidParams: {
          KEY_PARAM_VOLUME: 1,
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
        },
      });
    } catch (error: any) {
      console.log('TTS error:', error.message || error);
      // Silently fail if TTS is not available - user can still use text mode
    }
  };

  const startInterview = async () => {
    try {
      setLoading(true);
      const response = await apiService.post(API_ENDPOINTS.HEALTH_ASSISTANT_INTERVIEW, {
        conversation_history: [],
        language: selectedLanguage,
      });

      setCurrentQuestion(response.next_question);
      setConversationHistory([
        {role: 'assistant', content: response.next_question},
      ]);
      setQuestionCount(1);
      setShowLanguageSelector(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!answer.trim()) {
      Alert.alert('Empty Response', 'Please provide an answer before submitting.');
      return;
    }

    try {
      setLoading(true);

      // Add user's answer to conversation
      const updatedHistory = [
        ...conversationHistory,
        {role: 'user' as const, content: answer},
      ];
      setConversationHistory(updatedHistory);
      setUserInput('');

      // Get next question or summary from backend
      const response = await apiService.post(API_ENDPOINTS.HEALTH_ASSISTANT_INTERVIEW, {
        conversation_history: updatedHistory,
        language: selectedLanguage,
      });

      if (response.is_complete) {
        // Interview complete, show summary
        setIsComplete(true);
        setSummary(response.summary);
        setEditedSummary(response.summary);
      } else {
        // Add AI's next question to conversation
        const newHistory = [
          ...updatedHistory,
          {role: 'assistant' as const, content: response.next_question},
        ];
        setConversationHistory(newHistory);
        setCurrentQuestion(response.next_question);
        setQuestionCount(questionCount + 1);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = () => {
    submitAnswer(userInput);
  };

  const handleVoiceSubmit = async (result: RecordingResult) => {
    try {
      setLoading(true);

      // Convert recording to base64
      const audioBase64 = await voiceService.audioToBase64(result.uri);

      // Transcribe audio
      const transcriptionResponse = await encounterService.transcribeVoice(audioBase64);
      const transcription = transcriptionResponse.transcribed_text;

      // Submit the transcribed text
      await submitAnswer(transcription);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process voice input');
      setLoading(false);
    }
  };

  const createConsultation = async () => {
    if (!editedSummary.trim()) {
      Alert.alert('Empty Summary', 'Please provide a symptoms summary.');
      return;
    }

    try {
      setCreating(true);

      // Get current user ID
      const userId = await authService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create encounter
      const encounter = await encounterService.createEncounter({
        patient_id: userId,
        encounter_type: 'REMOTE_CONSULT',
        input_method: 'VOICE',
      });

      // Generate AI summary report with diagnosis/treatment
      await encounterService.generateSummary(
        encounter.encounter_id,
        editedSummary
      );

      Alert.alert(
        'Success',
        'Your consultation has been created! A doctor will review it soon.',
        [
          {
            text: 'View Consultation',
            onPress: () => {
              navigation.replace('EncounterDetail', {
                encounterId: encounter.encounter_id,
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create consultation');
    } finally {
      setCreating(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isAssistant = message.role === 'assistant';

    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          isAssistant ? styles.assistantBubble : styles.userBubble,
        ]}>
        <View style={styles.messageHeader}>
          <Icon
            name={isAssistant ? 'smart-toy' : 'person'}
            size={16}
            color={isAssistant ? '#2196F3' : '#4CAF50'}
          />
          <Text style={styles.messageRole}>
            {isAssistant ? 'Health Assistant' : 'You'}
          </Text>
        </View>
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    );
  };

  if (isComplete) {
    // Show summary review screen
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Review Summary</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Symptoms Summary</Text>
            <Text style={styles.summaryDescription}>
              Please review and edit your symptoms summary if needed:
            </Text>
            <TextInput
              style={styles.summaryInput}
              multiline
              numberOfLines={12}
              value={editedSummary}
              onChangeText={setEditedSummary}
              placeholder="Symptoms summary..."
              textAlignVertical="top"
            />
          </View>

          <View style={styles.infoBox}>
            <Icon name="info" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              After creating the consultation, our AI will analyze your symptoms and provide
              preliminary insights. A doctor will review and finalize the report.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={createConsultation}
            disabled={creating}>
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="add-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create Consultation</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Language selection screen
  if (showLanguageSelector) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Health Assistant</Text>
          <View style={{width: 24}} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.welcomeCard}>
            <Icon name="health-and-safety" size={48} color="#4CAF50" />
            <Text style={styles.welcomeTitle}>AI Health Assistant</Text>
            <Text style={styles.welcomeText}>
              I'll ask you questions in your preferred language to understand your symptoms better.
            </Text>
          </View>

          <View style={styles.languageSelectorCard}>
            <Text style={styles.languageSelectorTitle}>Select Your Language</Text>
            <Text style={styles.languageSelectorSubtitle}>
              Choose the language you're most comfortable with
            </Text>

            <TouchableOpacity
              style={[
                styles.languageOption,
                selectedLanguage === 'en' && styles.languageOptionSelected,
              ]}
              onPress={() => setSelectedLanguage('en')}>
              <View style={styles.languageOptionContent}>
                <Text style={styles.languageOptionFlag}>🇬🇧</Text>
                <View style={styles.languageOptionText}>
                  <Text style={styles.languageOptionName}>English</Text>
                  <Text style={styles.languageOptionNative}>English</Text>
                </View>
              </View>
              {selectedLanguage === 'en' && (
                <Icon name="check-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                selectedLanguage === 'gu' && styles.languageOptionSelected,
              ]}
              onPress={() => setSelectedLanguage('gu')}>
              <View style={styles.languageOptionContent}>
                <Text style={styles.languageOptionFlag}>🇮🇳</Text>
                <View style={styles.languageOptionText}>
                  <Text style={styles.languageOptionName}>Gujarati</Text>
                  <Text style={styles.languageOptionNative}>ગુજરાતી</Text>
                </View>
              </View>
              {selectedLanguage === 'gu' && (
                <Icon name="check-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                selectedLanguage === 'hi' && styles.languageOptionSelected,
              ]}
              onPress={() => setSelectedLanguage('hi')}>
              <View style={styles.languageOptionContent}>
                <Text style={styles.languageOptionFlag}>🇮🇳</Text>
                <View style={styles.languageOptionText}>
                  <Text style={styles.languageOptionName}>Hindi</Text>
                  <Text style={styles.languageOptionNative}>हिंदी</Text>
                </View>
              </View>
              {selectedLanguage === 'hi' && (
                <Icon name="check-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={startInterview}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="chat" size={24} color="#fff" />
                <Text style={styles.startButtonText}>Start Interview</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Health Assistant</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{questionCount}/6</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.welcomeCard}>
          <Icon name="health-and-safety" size={48} color="#4CAF50" />
          <Text style={styles.welcomeTitle}>AI Health Assistant</Text>
          <Text style={styles.welcomeText}>
            I'll ask you a few questions to understand your symptoms better.
          </Text>
        </View>

        {conversationHistory.slice(0, -1).map((msg, idx) => renderMessage(msg, idx))}
      </ScrollView>

      <View style={styles.inputContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <>
            <View style={styles.currentQuestion}>
              <Icon name="smart-toy" size={20} color="#2196F3" />
              <Text style={styles.questionText}>{currentQuestion}</Text>
              {inputMode === 'voice' && (
                <TouchableOpacity
                  onPress={async () => await speakQuestion(currentQuestion)}
                  style={styles.speakerButton}>
                  <Icon name="volume-up" size={20} color="#2196F3" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputModeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  inputMode === 'text' && styles.modeButtonActive,
                ]}
                onPress={async () => {
                  setInputMode('text');
                  try {
                    await Tts.stop();
                  } catch (e) {
                    // Ignore stop errors
                  }
                }}>
                <Icon
                  name="keyboard"
                  size={20}
                  color={inputMode === 'text' ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    inputMode === 'text' && styles.modeButtonTextActive,
                  ]}>
                  Type
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  inputMode === 'voice' && styles.modeButtonActive,
                ]}
                onPress={async () => {
                  setInputMode('voice');
                  if (currentQuestion) {
                    await speakQuestion(currentQuestion);
                  }
                }}>
                <Icon
                  name="mic"
                  size={20}
                  color={inputMode === 'voice' ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    inputMode === 'voice' && styles.modeButtonTextActive,
                  ]}>
                  Speak
                </Text>
              </TouchableOpacity>
            </View>

            {inputMode === 'text' ? (
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="Type your answer..."
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleTextSubmit}
                  disabled={!userInput.trim()}>
                  <Icon
                    name="send"
                    size={24}
                    color={userInput.trim() ? '#2196F3' : '#ccc'}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.voiceInputContainer}>
                <VoiceRecorder
                  onRecordingComplete={handleVoiceSubmit}
                  maxDuration={120}
                />
              </View>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 16,
  },
  progressBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
    borderTopRightRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  currentQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    margin: 12,
    borderRadius: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  speakerButton: {
    padding: 4,
    marginLeft: 8,
  },
  inputModeToggle: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#2196F3',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInputContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  summaryInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  languageSelectorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageSelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  languageSelectorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageOptionFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  languageOptionText: {
    flexDirection: 'column',
  },
  languageOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  languageOptionNative: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  startButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
