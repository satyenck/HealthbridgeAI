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
import {authService} from '../../services/authService';
import {doctorService} from '../../services/doctorService';
import {DoctorProfile} from '../../types';

export const DoctorProfileScreen = ({navigation}: any) => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getProfile();
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          },
        },
      ],
    );
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
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Icon name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {profile ? (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>
                Dr. {profile.first_name} {profile.last_name}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Specialty</Text>
              <Text style={styles.value}>{profile.specialty}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile.phone}</Text>
            </View>

            {profile.email && (
              <View style={styles.infoCard}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{profile.email}</Text>
              </View>
            )}

            {profile.license_number && (
              <View style={styles.infoCard}>
                <Text style={styles.label}>License Number</Text>
                <Text style={styles.value}>{profile.license_number}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="logout" size={20} color="#F44336" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No profile information available</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
});
