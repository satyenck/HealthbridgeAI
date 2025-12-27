import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tts from 'react-native-tts';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';

interface HealthAlert {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  action_needed: string;
}

interface PendingLab {
  order_id: string;
  test_name: string;
  lab_name: string;
  status: string;
  ordered_at: string;
}

interface PendingPrescription {
  prescription_id: string;
  medication_name: string;
  pharmacy_name: string;
  status: string;
  prescribed_at: string;
}

interface HealthInsights {
  ai_insights: {
    health_alerts: HealthAlert[];
    dos: string[];
    donts: string[];
    positive_notes: string[];
  };
  pending_labs: PendingLab[];
  pending_prescriptions: PendingPrescription[];
}

export const InsightsScreen = () => {
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Gujarati'>('English');
  const [translating, setTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Initialize TTS with proper error handling
    const initTts = async () => {
      try {
        await Tts.setDefaultLanguage(language === 'Gujarati' ? 'gu-IN' : 'en-US');
        await Tts.setDefaultRate(0.5, true); // Second param for iOS
        await Tts.setDefaultPitch(1.0);
      } catch (error) {
        console.log('TTS init warning:', error);
      }
    };

    initTts();

    // Add event listeners
    const startListener = Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    const finishListener = Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    const cancelListener = Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));

    return () => {
      // Cleanup
      try {
        if (startListener) startListener.remove();
        if (finishListener) finishListener.remove();
        if (cancelListener) cancelListener.remove();
        Tts.stop().catch(() => {}); // Ignore stop errors
      } catch (error) {
        console.log('TTS cleanup warning:', error);
      }
    };
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadInsights('English');
      return () => {
        // Stop speaking when leaving screen
        try {
          Tts.stop().catch(() => {});
        } catch (error) {
          console.log('TTS stop warning:', error);
        }
        setIsSpeaking(false);
      };
    }, []),
  );

  const loadInsights = async (lang: 'English' | 'Gujarati' = language) => {
    try {
      setLoading(true);
      const endpoint = `${API_ENDPOINTS.HEALTH_INSIGHTS}?language=${lang}`;
      const data = await apiService.get<HealthInsights>(endpoint);
      setInsights(data);
      setLanguage(lang);
    } catch (error: any) {
      console.error('Insights loading error:', error);
      Alert.alert('Error', error.message || 'Failed to load health insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTranslating(false);
    }
  };

  const handleTranslate = async () => {
    const targetLanguage = language === 'English' ? 'Gujarati' : 'English';
    setTranslating(true);
    await loadInsights(targetLanguage);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      // Stop speaking
      try {
        await Tts.stop();
      } catch (error) {
        console.log('TTS stop error:', error);
      }
      setIsSpeaking(false);
      return;
    }

    if (!insights) {
      Alert.alert('No Insights', 'Please wait for insights to load first.');
      return;
    }

    try {
      // Check available voices and set language
      const voices = await Tts.voices();
      const gujaratiVoice = voices.find((v: any) =>
        v.language === 'gu-IN' || v.language.startsWith('gu')
      );

      if (language === 'Gujarati') {
        if (gujaratiVoice) {
          await Tts.setDefaultLanguage('gu-IN');
        } else {
          Alert.alert(
            'Gujarati Voice Not Available',
            'Your device does not have Gujarati voice installed. Speaking in English instead.',
          );
          await Tts.setDefaultLanguage('en-US');
        }
      } else {
        await Tts.setDefaultLanguage('en-US');
      }

      // Build speech text - ONLY DOs and DON'Ts
      let speechText = '';

      // Add DOs
      if (insights.ai_insights?.dos?.length > 0) {
        speechText += language === 'Gujarati'
          ? 'તમારે શું કરવું જોઈએ. '
          : 'What You Should Do. ';

        insights.ai_insights.dos.forEach((item, index) => {
          speechText += `${index + 1}. ${item}. `;
        });
      }

      // Add DON'Ts
      if (insights.ai_insights?.donts?.length > 0) {
        speechText += language === 'Gujarati'
          ? 'તમારે શું ટાળવું જોઈએ. '
          : 'What to Avoid. ';

        insights.ai_insights.donts.forEach((item, index) => {
          speechText += `${index + 1}. ${item}. `;
        });
      }

      if (speechText.trim() === '') {
        Alert.alert(
          'No Content',
          'There are no insights to read aloud.',
        );
        return;
      }

      // Speak the text
      Tts.speak(speechText);
    } catch (error) {
      console.error('TTS Error:', error);
      Alert.alert('Error', 'Failed to read insights aloud');
      setIsSpeaking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>My Health Insights</Text>
            <Text style={styles.subtitle}>
              Personalized health guidance for you
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.iconButton, isSpeaking && styles.iconButtonActive]}
              onPress={handleSpeak}
              disabled={loading || !insights}>
              <Icon
                name={isSpeaking ? 'stop' : 'volume-up'}
                size={24}
                color={isSpeaking ? '#F44336' : '#2196F3'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.translateButton}
              onPress={handleTranslate}
              disabled={translating}>
              {translating ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <>
                  <Icon name="translate" size={20} color="#2196F3" />
                  <Text style={styles.translateButtonText}>
                    {language === 'English' ? 'ગુજરાતી' : 'English'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Health Alerts */}
        {insights?.ai_insights?.health_alerts &&
          insights.ai_insights.health_alerts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Alerts</Text>
              {insights.ai_insights.health_alerts.map((alert, index) => (
                <View
                  key={index}
                  style={[
                    styles.alertCard,
                    {borderLeftColor: getSeverityColor(alert.severity)},
                  ]}>
                  <View style={styles.alertHeader}>
                    <Icon
                      name={getSeverityIcon(alert.severity)}
                      size={24}
                      color={getSeverityColor(alert.severity)}
                    />
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                  </View>
                  <Text style={styles.alertDescription}>
                    {alert.description}
                  </Text>
                  <View style={styles.actionContainer}>
                    <Icon name="assignment" size={16} color="#666" />
                    <Text style={styles.actionText}>{alert.action_needed}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* Pending Lab Tests */}
        {insights?.pending_labs && insights.pending_labs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Lab Tests</Text>
            {insights.pending_labs.map(lab => (
              <View key={lab.order_id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <Icon name="science" size={20} color="#2196F3" />
                  <Text style={styles.pendingTitle}>{lab.test_name}</Text>
                </View>
                <Text style={styles.pendingDetail}>Lab: {lab.lab_name}</Text>
                <Text style={styles.pendingDetail}>
                  Status: {lab.status.replace('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending Prescriptions */}
        {insights?.pending_prescriptions &&
          insights.pending_prescriptions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Prescriptions</Text>
              {insights.pending_prescriptions.map(prescription => (
                <View
                  key={prescription.prescription_id}
                  style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <Icon name="medication" size={20} color="#4CAF50" />
                    <Text style={styles.pendingTitle}>
                      {prescription.medication_name}
                    </Text>
                  </View>
                  <Text style={styles.pendingDetail}>
                    Pharmacy: {prescription.pharmacy_name}
                  </Text>
                  <Text style={styles.pendingDetail}>
                    Status: {prescription.status.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

        {/* DOs */}
        {insights?.ai_insights?.dos && insights.ai_insights.dos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DOs - What You Should Do</Text>
            <View style={styles.recommendationsCard}>
              {insights.ai_insights.dos.map((item, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Icon name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.recommendationText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* DON'Ts */}
        {insights?.ai_insights?.donts &&
          insights.ai_insights.donts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                DON'Ts - What to Avoid
              </Text>
              <View style={styles.recommendationsCard}>
                {insights.ai_insights.donts.map((item, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Icon name="cancel" size={20} color="#F44336" />
                    <Text style={styles.recommendationText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Positive Notes */}
        {insights?.ai_insights?.positive_notes &&
          insights.ai_insights.positive_notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Positive Progress</Text>
              <View style={styles.positiveCard}>
                {insights.ai_insights.positive_notes.map((note, index) => (
                  <View key={index} style={styles.positiveItem}>
                    <Icon name="favorite" size={20} color="#E91E63" />
                    <Text style={styles.positiveText}>{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Empty State */}
        {insights &&
          !insights.ai_insights?.health_alerts?.length &&
          !insights.pending_labs?.length &&
          !insights.pending_prescriptions?.length &&
          !insights.ai_insights?.dos?.length &&
          !insights.ai_insights?.donts?.length && (
            <View style={styles.emptyState}>
              <Icon name="insights" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No insights available yet</Text>
              <Text style={styles.emptySubtext}>
                Complete more consultations to get personalized health insights
              </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 48,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
  },
  translateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pendingDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  positiveCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  positiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  positiveText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});
