import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {profileService, UserProfile} from '../services/profileService';
import {consultationService, Consultation} from '../services/consultationService';
import {authService} from '../services/authService';

export const HomeScreen = ({navigation}: any) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, consultationsData] = await Promise.all([
        profileService.getProfile().catch(() => null),
        consultationService.getConsultations().catch(() => []),
      ]);

      setProfile(profileData);
      setConsultations(consultationsData);

      if (!profileData) {
        navigation.navigate('ProfileCreate');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const handleNewConsultation = () => {
    navigation.navigate('NewConsultation');
  };

  const handleViewConsultation = (consultation: Consultation) => {
    navigation.navigate('ConsultationDetail', {consultation});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>HealthbridgeAI</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {profile && (
        <View style={styles.profileCard}>
          <Text style={styles.welcomeText}>
            Welcome, {profile.first_name}!
          </Text>
          <Text style={styles.profileSubtext}>
            {profile.gender} • {new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()} years old
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.newConsultationButton}
        onPress={handleNewConsultation}>
        <Text style={styles.newConsultationIcon}>💬</Text>
        <Text style={styles.newConsultationText}>
          Need Medical Consultation?
        </Text>
        <Text style={styles.newConsultationSubtext}>
          Describe your symptoms and get AI-powered insights
        </Text>
      </TouchableOpacity>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Consultation History</Text>

        {consultations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No consultations yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Start your first consultation to get personalized health insights
            </Text>
          </View>
        ) : (
          consultations.map(consultation => (
            <TouchableOpacity
              key={consultation.id}
              style={styles.consultationCard}
              onPress={() => handleViewConsultation(consultation)}>
              <Text style={styles.consultationDate}>
                {new Date(consultation.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.consultationDescription} numberOfLines={2}>
                {consultation.patient_description}
              </Text>
              {consultation.symptoms && (
                <Text style={styles.consultationSymptoms} numberOfLines={1}>
                  Symptoms: {consultation.symptoms}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
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
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  profileSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  newConsultationButton: {
    backgroundColor: '#27ae60',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  newConsultationIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  newConsultationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  newConsultationSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  historySection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  consultationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  consultationDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 8,
  },
  consultationDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  consultationSymptoms: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
});
