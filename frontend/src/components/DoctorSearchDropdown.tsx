import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {Doctor} from '../types';
import {doctorService} from '../services/doctorService';

interface DoctorSearchDropdownProps {
  selectedDoctorId: string | null;
  selectedDoctorName: string | null;
  onSelect: (doctorId: string | null, doctorName: string | null, isNotInList: boolean) => void;
  onCreateDoctor?: (name: string, phone: string) => Promise<string>;
}

export const DoctorSearchDropdown: React.FC<DoctorSearchDropdownProps> = ({
  selectedDoctorId,
  selectedDoctorName,
  onSelect,
  onCreateDoctor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotInListFields, setShowNotInListFields] = useState(false);

  // Fields for "My doctor not in list"
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [creatingDoctor, setCreatingDoctor] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await doctorService.searchDoctors(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching doctors:', error);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDoctor = (doctor: Doctor) => {
    const displayName = `Dr. ${doctor.first_name} ${doctor.last_name}${
      doctor.specialty ? ` - ${doctor.specialty}` : ''
    }${doctor.hospital_name ? `, ${doctor.hospital_name}` : ''}`;

    setSearchQuery(displayName);
    onSelect(doctor.user_id, displayName, false);
    setShowDropdown(false);
    setShowNotInListFields(false);
  };

  const handleSelectNotInList = () => {
    setSearchQuery('My doctor not in list');
    setShowDropdown(false);
    setShowNotInListFields(true);
    onSelect(null, null, true);
  };

  const handleCreateDoctor = async () => {
    if (!doctorName.trim()) {
      Alert.alert('Error', 'Please enter doctor name');
      return;
    }
    if (!doctorPhone.trim()) {
      Alert.alert('Error', 'Please enter doctor phone number');
      return;
    }

    if (!onCreateDoctor) {
      Alert.alert('Error', 'Create doctor function not provided');
      return;
    }

    try {
      setCreatingDoctor(true);
      const doctorId = await onCreateDoctor(doctorName, doctorPhone);
      const displayName = `Dr. ${doctorName}`;

      setSearchQuery(displayName);
      onSelect(doctorId, displayName, false);
      setShowNotInListFields(false);
      setDoctorName('');
      setDoctorPhone('');

      Alert.alert('Success', 'Doctor added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add doctor');
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setShowNotInListFields(false);
    setDoctorName('');
    setDoctorPhone('');
    onSelect(null, null, false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search for your doctor..."
        onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
      />

      {searchQuery && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator style={styles.loader} />}

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.resultsList} nestedScrollEnabled>
            {searchResults.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery.length >= 2 ? 'No doctors found' : 'Type to search'}
              </Text>
            ) : (
              searchResults.map((item) => (
                <TouchableOpacity
                  key={item.user_id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectDoctor(item)}>
                  <Text style={styles.doctorName}>
                    Dr. {item.first_name} {item.last_name}
                  </Text>
                  {(item.specialty || item.hospital_name) && (
                    <Text style={styles.doctorDetails}>
                      {item.specialty && item.specialty}
                      {item.specialty && item.hospital_name && ' • '}
                      {item.hospital_name && item.hospital_name}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={styles.notInListButton}
              onPress={handleSelectNotInList}>
              <Text style={styles.notInListText}>
                My doctor not in list
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {showNotInListFields && (
        <View style={styles.notInListFields}>
          <Text style={styles.sectionTitle}>Add Your Doctor</Text>

          <Text style={styles.label}>Doctor Name *</Text>
          <TextInput
            style={styles.input}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Enter doctor's full name"
          />

          <Text style={styles.label}>Doctor Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={doctorPhone}
            onChangeText={setDoctorPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateDoctor}
            disabled={creatingDoctor}>
            {creatingDoctor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Add Doctor</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  clearText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: 8,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsList: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doctorDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
  },
  notInListButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  notInListText: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '600',
    textAlign: 'center',
  },
  notInListFields: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 12,
  },
  createButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
