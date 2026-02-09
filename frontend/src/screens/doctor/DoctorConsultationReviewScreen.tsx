import React, {useState, useEffect} from 'react';
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
import {encounterService} from '../../services/encounterService';
import {SummaryReportContent} from '../../types';

interface DoctorConsultationReviewScreenProps {
  route: {
    params: {
      encounterId: string;
      audioBase64: string;
      patientName: string;
      language?: string;
    };
  };
  navigation: any;
}

export const DoctorConsultationReviewScreen: React.FC<
  DoctorConsultationReviewScreenProps
> = ({route, navigation}) => {
  const {encounterId, audioBase64, patientName, language = 'en'} = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [reportContent, setReportContent] = useState<SummaryReportContent | null>(
    null,
  );
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'gu' | 'hi'>(language as 'en' | 'gu' | 'hi');
  const [translating, setTranslating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [hasAISummary, setHasAISummary] = useState(false);

  useEffect(() => {
    processConsultation();
  }, []);

  const processConsultation = async () => {
    try {
      setLoading(true);

      // Process voice consultation - creates complete summary report
      const response = await encounterService.processVoiceEncounter(
        encounterId,
        audioBase64,
      );

      // Validate response
      if (!response.transcription?.transcription) {
        throw new Error('No transcription was generated from the recording. Please ensure you spoke clearly and try again.');
      }

      if (!response.summary_report?.content) {
        throw new Error('Failed to generate medical summary from the recording. Please try again with more detailed information.');
      }

      setTranscription(response.transcription.transcription);
      setReportContent(response.summary_report.content);

      // Check if AI summary has been generated (has diagnosis or symptoms)
      const hasAI = response.summary_report.content?.diagnosis || response.summary_report.content?.symptoms;
      setHasAISummary(!!hasAI);
    } catch (error: any) {
      console.error('Process consultation error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to process consultation';

      Alert.alert(
        'Processing Failed',
        errorMessage + '\n\nPlease try recording again with clear audio.',
        [
          {
            text: 'Try Again',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (targetLang: 'en' | 'gu' | 'hi', languageName: string) => {
    // Prevent multiple simultaneous translations
    if (translating) {
      return;
    }

    try {
      setTranslating(true);
      const response = await encounterService.translateSummary(encounterId, targetLang);
      setReportContent(response.content);
      setSelectedLanguage(targetLang);
      Alert.alert('Success', `Report translated to ${languageName}`);
    } catch (error: any) {
      console.error('Translation error:', error);
      const errorMessage = error.code === 'ECONNABORTED'
        ? 'Translation is taking longer than expected. Please try again.'
        : error.message || 'Failed to translate report';
      Alert.alert('Translation Error', errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleGenerateAISummary = async () => {
    try {
      setGeneratingAI(true);

      // Call generate AI summary endpoint with transcription
      const response = await encounterService.generateSummary(
        encounterId,
        transcription,
      );

      // Update report content with AI-generated summary
      setReportContent(response.content);
      setHasAISummary(true);

      Alert.alert('Success', 'AI summary generated successfully');
    } catch (error: any) {
      console.error('AI generation error:', error);
      Alert.alert('Error', error.message || 'Failed to generate AI summary');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      // Mark report as REVIEWED
      await encounterService.updateSummaryReport(encounterId, {
        status: 'REVIEWED',
      });

      Alert.alert(
        'Success',
        'Consultation documented and marked as reviewed',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to patient timeline
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Complete error:', error);
      Alert.alert('Error', error.message || 'Failed to complete consultation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
        <Text style={styles.loadingText}>Processing consultation...</Text>
        <Text style={styles.loadingSubtext}>
          Transcribing and generating medical summary
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation Summary</Text>
        <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
          {/* Language Translation Buttons */}
          {translating ? (
            <View style={styles.translatingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.translatingText}>Translating</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleTranslate('gu', 'Gujarati')}
                disabled={translating}>
                <Text style={styles.languageButtonText}>ક</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleTranslate('hi', 'Hindi')}
                disabled={translating}>
                <Text style={styles.languageButtonText}>क</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleTranslate('en', 'English')}
                disabled={translating}>
                <Text style={styles.languageButtonText}>K</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Patient Info */}
        <View style={styles.patientCard}>
          <Icon name="person" size={24} color="#00ACC1" />
          <Text style={styles.patientName}>{patientName}</Text>
        </View>

        {/* Transcription */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="mic" size={20} color="#00ACC1" />
            <Text style={styles.sectionTitle}>Consultation Transcript</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        </View>

        {/* Generated Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Generated Medical Summary</Text>
          <Text style={styles.sectionSubtitle}>
            Review the automatically extracted medical information
          </Text>

          {reportContent?.symptoms && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Symptoms</Text>
              <Text style={styles.fieldValue}>{reportContent.symptoms}</Text>
            </View>
          )}

          {reportContent?.diagnosis && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Diagnosis</Text>
              <Text style={styles.fieldValue}>{reportContent.diagnosis}</Text>
            </View>
          )}

          {reportContent?.treatment && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Treatment Plan</Text>
              <Text style={styles.fieldValue}>{reportContent.treatment}</Text>
            </View>
          )}

          {reportContent?.tests && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Recommended Tests</Text>
              <Text style={styles.fieldValue}>{reportContent.tests}</Text>
            </View>
          )}

          {reportContent?.prescription && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Prescription</Text>
              <Text style={styles.fieldValue}>{reportContent.prescription}</Text>
            </View>
          )}

          {reportContent?.next_steps && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Next Steps</Text>
              <Text style={styles.fieldValue}>{reportContent.next_steps}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Generate AI Summary Button - Only show if no AI summary exists yet */}
        {!hasAISummary && (
          <TouchableOpacity
            style={[styles.button, styles.generateButton]}
            onPress={handleGenerateAISummary}
            disabled={generatingAI}>
            {generatingAI ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate AI Summary</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.completeButton]}
          onPress={handleComplete}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Complete</Text>
          )}
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#00ACC1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  languageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  translatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  translatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ACC1',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#2196F3',
    marginBottom: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#00ACC1',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
