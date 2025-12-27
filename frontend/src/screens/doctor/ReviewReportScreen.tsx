import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../../services/encounterService';
import {SummaryReport, ReportStatus, Priority, SummaryReportContent} from '../../types';
import {SendToLabModal} from '../../components/SendToLabModal';
import {SendToPharmacyModal} from '../../components/SendToPharmacyModal';
import {VoiceReportEditorModal} from '../../components/VoiceReportEditorModal';

export const ReviewReportScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [tests, setTests] = useState('');
  const [prescription, setPrescription] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [encounterId]),
  );

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await encounterService.getSummaryReport(encounterId);
      setReport(data);
      populateForm(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load report');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: SummaryReport) => {
    setSymptoms(data.content.symptoms);
    setDiagnosis(data.content.diagnosis);
    setTreatment(data.content.treatment);
    setTests(data.content.tests || '');
    setPrescription(data.content.prescription || '');
    setNextSteps(data.content.next_steps);
    setPriority(data.priority || Priority.MEDIUM);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!symptoms || symptoms.trim() === '') {
      Alert.alert('Validation Error', 'Symptoms field is required');
      return;
    }
    if (!diagnosis || diagnosis.trim() === '') {
      Alert.alert('Validation Error', 'Diagnosis field is required');
      return;
    }
    if (!treatment || treatment.trim() === '') {
      Alert.alert('Validation Error', 'Treatment field is required');
      return;
    }
    if (!nextSteps || nextSteps.trim() === '') {
      Alert.alert('Validation Error', 'Next Steps field is required');
      return;
    }

    try {
      setSaving(true);
      await encounterService.updateSummaryReport(encounterId, {
        status: ReportStatus.REVIEWED,
        priority,
        content: {
          symptoms,
          diagnosis,
          treatment,
          tests: tests || null,
          prescription: prescription || null,
          next_steps: nextSteps,
        },
      });

      Alert.alert('Success', 'Report reviewed and saved', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Report</Text>
        {!editing && (
          <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity onPress={() => setShowVoiceModal(true)}>
              <Icon name="mic" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Icon name="edit" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityButtons}>
            {Object.values(Priority).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  priority === p && styles.priorityButtonActive,
                ]}
                onPress={() => setPriority(p)}
                disabled={!editing}>
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === p && styles.priorityButtonTextActive,
                  ]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Symptoms</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            editable={editing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Diagnosis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            editable={editing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Treatment</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={treatment}
            onChangeText={setTreatment}
            multiline
            editable={editing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tests</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={tests}
            onChangeText={setTests}
            multiline
            editable={editing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Prescription</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={prescription}
            onChangeText={setPrescription}
            multiline
            editable={editing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Next Steps</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={nextSteps}
            onChangeText={setNextSteps}
            multiline
            editable={editing}
          />
        </View>

        {/* Send to Lab and Pharmacy buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowLabModal(true)}>
            <Icon name="science" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Send to Lab</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPharmacyModal(true)}>
            <Icon name="local-pharmacy" size={20} color="#9C27B0" />
            <Text style={styles.actionButtonText}>Send to Pharmacy</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Consultation button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.voiceCallButton]}
            onPress={() => navigation.navigate('VoiceCall', {encounterId})}>
            <Icon name="phone" size={20} color="#fff" />
            <Text style={styles.voiceCallButtonText}>Start Voice Consultation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <SendToLabModal
        visible={showLabModal}
        encounterId={encounterId}
        onClose={() => setShowLabModal(false)}
        onSuccess={() => Alert.alert('Success', 'Lab order sent successfully')}
        initialInstructions={tests}
      />

      <SendToPharmacyModal
        visible={showPharmacyModal}
        encounterId={encounterId}
        onClose={() => setShowPharmacyModal(false)}
        onSuccess={() =>
          Alert.alert('Success', 'Prescription sent successfully')
        }
        initialInstructions={prescription}
      />

      <VoiceReportEditorModal
        visible={showVoiceModal}
        encounterId={encounterId}
        onClose={() => setShowVoiceModal(false)}
        onApprove={(extractedFields: Partial<SummaryReportContent>) => {
          // Populate form with extracted fields
          if (extractedFields.symptoms) setSymptoms(extractedFields.symptoms);
          if (extractedFields.diagnosis) setDiagnosis(extractedFields.diagnosis);
          if (extractedFields.treatment) setTreatment(extractedFields.treatment);
          if (extractedFields.tests) setTests(extractedFields.tests);
          if (extractedFields.prescription) setPrescription(extractedFields.prescription);
          if (extractedFields.next_steps) setNextSteps(extractedFields.next_steps);
          setEditing(true); // Auto-enable editing mode
          setShowVoiceModal(false);
        }}
      />

      {editing && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save & Mark Reviewed</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#4CAF50',
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
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  voiceCallButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  voiceCallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
