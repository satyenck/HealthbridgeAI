import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {Consultation} from '../services/consultationService';

export const ConsultationDetailScreen = ({route, navigation}: any) => {
  const {consultation} = route.params as {consultation: Consultation};

  const renderSection = (title: string, content?: string) => {
    if (!content) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionContent}>{content}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Consultation Report</Text>
        <Text style={styles.date}>
          {new Date(consultation.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ This report is for informational purposes only and is not a
            substitute for professional medical advice, diagnosis, or treatment.
            Always consult with a qualified healthcare provider.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Description</Text>
          <Text style={styles.sectionContent}>
            {consultation.patient_description}
          </Text>
        </View>

        {renderSection('Symptoms', consultation.symptoms)}
        {renderSection('Potential Diagnosis', consultation.potential_diagnosis)}
        {renderSection('Potential Treatment', consultation.potential_treatment)}
        {renderSection('Next Steps', consultation.next_steps)}

        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Need Further Assistance?</Text>
          <Text style={styles.actionText}>
            If your symptoms persist or worsen, please seek immediate medical
            attention from a healthcare professional.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newConsultationButton}
          onPress={() => navigation.navigate('NewConsultation')}>
          <Text style={styles.newConsultationButtonText}>
            Start New Consultation
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 20,
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
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  actionBox: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  newConsultationButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  newConsultationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
