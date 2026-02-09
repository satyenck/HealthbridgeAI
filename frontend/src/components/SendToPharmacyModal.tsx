import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../services/encounterService';
import {PharmacyProfile} from '../types';

interface SendToPharmacyModalProps {
  visible: boolean;
  encounterId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialInstructions?: string;
}

export const SendToPharmacyModal: React.FC<SendToPharmacyModalProps> = ({
  visible,
  encounterId,
  onClose,
  onSuccess,
  initialInstructions = '',
}) => {
  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [selectedPharmacyName, setSelectedPharmacyName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPharmacies();
      setInstructions(initialInstructions);
    }
  }, [visible, initialInstructions]);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const data = await encounterService.getAvailablePharmacies();
      setPharmacies(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.business_name.toLowerCase().includes(searchText.toLowerCase()) ||
    pharmacy.phone.includes(searchText) ||
    pharmacy.address.toLowerCase().includes(searchText.toLowerCase())
  );

  const handlePharmacySelect = (pharmacy: PharmacyProfile) => {
    setSelectedPharmacy(pharmacy.user_id);
    setSelectedPharmacyName(pharmacy.business_name);
    setSearchText(pharmacy.business_name);
    setShowDropdown(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setShowDropdown(text.length > 0);
    if (text === '') {
      setSelectedPharmacy(null);
      setSelectedPharmacyName('');
    }
  };

  const handleSend = async () => {
    if (!selectedPharmacy) {
      Alert.alert('Error', 'Please select a pharmacy');
      return;
    }

    if (!instructions.trim()) {
      Alert.alert('Error', 'Please enter prescription details');
      return;
    }

    try {
      setSending(true);
      await encounterService.createPrescription(
        encounterId,
        selectedPharmacy,
        instructions,
      );
      Alert.alert('Success', 'Prescription sent successfully');
      setSelectedPharmacy(null);
      setSelectedPharmacyName('');
      setSearchText('');
      setInstructions('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send prescription');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Send to Pharmacy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ACC1" />
            </View>
          ) : (
            <ScrollView style={styles.content}>
              <Text style={styles.label}>Select Pharmacy *</Text>
              <View style={styles.autocompleteContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={handleSearchChange}
                  placeholder="Type to search pharmacies..."
                  onFocus={() => setShowDropdown(searchText.length > 0)}
                />
                {showDropdown && filteredPharmacies.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      keyboardShouldPersistTaps="handled">
                      {filteredPharmacies.map(pharmacy => (
                        <TouchableOpacity
                          key={pharmacy.user_id}
                          style={styles.dropdownItem}
                          onPress={() => handlePharmacySelect(pharmacy)}>
                          <Text style={styles.dropdownItemName}>
                            {pharmacy.business_name}
                          </Text>
                          <Text style={styles.dropdownItemDetails}>
                            {pharmacy.phone} • {pharmacy.address}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {selectedPharmacy && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check-circle" size={16} color="#00ACC1" />
                    <Text style={styles.selectedBadgeText}>
                      {selectedPharmacyName} selected
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.label, {marginTop: 20}]}>
                Prescription Details *
              </Text>
              <TextInput
                style={styles.textArea}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Enter medication details (e.g., Amoxicillin 500mg, Take 3 times daily for 7 days)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={sending}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={sending || loading}>
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Prescription</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  autocompleteContainer: {
    position: 'relative',
    marginBottom: 12,
    zIndex: 1000,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dropdownItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 13,
    color: '#00ACC1',
    fontWeight: '600',
    marginLeft: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#00ACC1',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
