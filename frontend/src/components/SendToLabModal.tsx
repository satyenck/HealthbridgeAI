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
import {LabProfile} from '../types';

interface SendToLabModalProps {
  visible: boolean;
  encounterId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialInstructions?: string;
}

export const SendToLabModal: React.FC<SendToLabModalProps> = ({
  visible,
  encounterId,
  onClose,
  onSuccess,
  initialInstructions = '',
}) => {
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [selectedLabName, setSelectedLabName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLabs();
      setInstructions(initialInstructions);
    }
  }, [visible, initialInstructions]);

  const loadLabs = async () => {
    try {
      setLoading(true);
      const data = await encounterService.getAvailableLabs();
      setLabs(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load labs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter(lab =>
    lab.business_name.toLowerCase().includes(searchText.toLowerCase()) ||
    lab.phone.includes(searchText) ||
    lab.address.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleLabSelect = (lab: LabProfile) => {
    setSelectedLab(lab.user_id);
    setSelectedLabName(lab.business_name);
    setSearchText(lab.business_name);
    setShowDropdown(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setShowDropdown(text.length > 0);
    if (text === '') {
      setSelectedLab(null);
      setSelectedLabName('');
    }
  };

  const handleSend = async () => {
    if (!selectedLab) {
      Alert.alert('Error', 'Please select a lab');
      return;
    }

    if (!instructions.trim()) {
      Alert.alert('Error', 'Please enter test instructions');
      return;
    }

    try {
      setSending(true);
      await encounterService.createLabOrder(
        encounterId,
        selectedLab,
        instructions,
      );
      Alert.alert('Success', 'Lab order sent successfully');
      setSelectedLab(null);
      setSelectedLabName('');
      setSearchText('');
      setInstructions('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send lab order');
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
            <Text style={styles.title}>Send to Lab</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <ScrollView style={styles.content}>
              <Text style={styles.label}>Select Lab *</Text>
              <View style={styles.autocompleteContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={handleSearchChange}
                  placeholder="Type to search labs..."
                  onFocus={() => setShowDropdown(searchText.length > 0)}
                />
                {showDropdown && filteredLabs.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      keyboardShouldPersistTaps="handled">
                      {filteredLabs.map(lab => (
                        <TouchableOpacity
                          key={lab.user_id}
                          style={styles.dropdownItem}
                          onPress={() => handleLabSelect(lab)}>
                          <Text style={styles.dropdownItemName}>
                            {lab.business_name}
                          </Text>
                          <Text style={styles.dropdownItemDetails}>
                            {lab.phone} • {lab.address}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {selectedLab && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.selectedBadgeText}>
                      {selectedLabName} selected
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.label, {marginTop: 20}]}>
                Test Instructions *
              </Text>
              <TextInput
                style={styles.textArea}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Enter test details (e.g., CBC, Lipid Panel, Blood Sugar)"
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
                <Text style={styles.sendButtonText}>Send Order</Text>
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
    color: '#4CAF50',
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
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
