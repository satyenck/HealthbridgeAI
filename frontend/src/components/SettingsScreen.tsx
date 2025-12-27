import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import apiService from '../services/apiService';
import {LabProfile, PharmacyProfile} from '../types';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<LabProfile | PharmacyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Get user role from storage to determine which endpoint to call
      const role = await AsyncStorage.getItem('user_role');

      let endpoint = '';
      if (role === 'LAB') {
        endpoint = '/api/lab/profile';
      } else if (role === 'PHARMACY') {
        endpoint = '/api/pharmacy/profile';
      }

      if (!endpoint) {
        console.error('Unknown role:', role);
        Alert.alert('Error', 'Unknown user role');
        return;
      }

      console.log('Fetching profile from:', endpoint);
      const data = await apiService.get(endpoint);
      console.log('Profile data received:', data);
      setProfile(data);
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_role');
            navigation.reset({
              index: 0,
              routes: [{name: 'Login' as never}],
            });
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Icon name="business" size={40} color="#9C27B0" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>{profile?.business_name || 'Lab/Pharmacy'}</Text>
              <Text style={styles.email}>{profile?.email || ''}</Text>
            </View>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Icon name="phone" size={20} color="#666" />
              <Text style={styles.detailText}>{profile?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="location-on" size={20} color="#666" />
              <Text style={styles.detailText}>{profile?.address || 'N/A'}</Text>
            </View>
            {profile?.license_year && (
              <View style={styles.detailRow}>
                <Icon name="verified" size={20} color="#666" />
                <Text style={styles.detailText}>Licensed since {profile.license_year}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#f44336" />
          <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          <Icon name="chevron-right" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>HealthBridge AI v2.0</Text>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 16,
    marginTop: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  profileDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  logoutText: {
    color: '#f44336',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
