import React, {useState, useEffect} from 'react';
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import {profileService} from '../../services/profileService';
import {authService} from '../../services/authService';
import {PatientProfile, Gender} from '../../types';
import {formatDate, calculateAge} from '../../utils/dateHelpers';

export const ProfileScreen = ({navigation}: any) => {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.PREFER_NOT_TO_SAY);
  const [healthIssues, setHealthIssues] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
      populateForm(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Profile doesn't exist, enable editing
        setEditing(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: PatientProfile) => {
    setFirstName(data.first_name);
    setLastName(data.last_name);
    setDateOfBirth(data.date_of_birth);
    setGender(data.gender);
    setHealthIssues(data.general_health_issues || '');
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !dateOfBirth) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const data = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        gender,
        general_health_issues: healthIssues || undefined,
      };

      if (profile) {
        const updated = await profileService.updateProfile(data);
        setProfile(updated);
      } else {
        const created = await profileService.createProfile(data);
        setProfile(created);
      }

      setEditing(false);
      Alert.alert('Success', 'Profile saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
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
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <View style={styles.headerActions}>
          {!editing && profile && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.headerButton}>
              <Icon name="edit" size={24} color="#2196F3" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Icon name="logout" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!editing && profile ? (
          // View mode
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile.first_name} {profile.last_name}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>
                {formatDate(profile.date_of_birth)} ({calculateAge(profile.date_of_birth)} years)
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{profile.gender}</Text>
            </View>

            {profile.general_health_issues && (
              <View style={styles.infoCard}>
                <Text style={styles.label}>General Health Issues</Text>
                <Text style={styles.value}>{profile.general_health_issues}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="logout" size={20} color="#F44336" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Edit mode
          <View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderButtons}>
                {Object.values(Gender).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      gender === g && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender(g)}>
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === g && styles.genderButtonTextActive,
                      ]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>General Health Issues</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={healthIssues}
                onChangeText={setHealthIssues}
                placeholder="List any ongoing health conditions"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.buttonRow}>
              {profile && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setEditing(false);
                    populateForm(profile);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  formGroup: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  genderButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
});
