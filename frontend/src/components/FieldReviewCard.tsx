import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface FieldReviewCardProps {
  label: string;
  currentValue: string | null;
  extractedValue: string | null;
  onEdit: (value: string) => void;
  readOnly?: boolean;
}

export const FieldReviewCard: React.FC<FieldReviewCardProps> = ({
  label,
  currentValue,
  extractedValue,
  onEdit,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(extractedValue || '');

  // If no extracted value, don't show this card
  if (!extractedValue || extractedValue === 'null') {
    return null;
  }

  const handleSaveEdit = () => {
    onEdit(editedValue);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedValue(extractedValue || '');
    setIsEditing(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>

      {/* Current Value */}
      {currentValue && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current:</Text>
          <Text style={styles.currentValue}>{currentValue}</Text>
        </View>
      )}

      {/* Extracted Value */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AI Extracted:</Text>
        {isEditing ? (
          <TextInput
            style={styles.editInput}
            value={editedValue}
            onChangeText={setEditedValue}
            multiline
            numberOfLines={4}
          />
        ) : (
          <View style={styles.extractedContainer}>
            <Text style={styles.extractedValue}>{extractedValue}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!readOnly && (
        <>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}>
                <Icon name="close" size={18} color="#666" />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveEdit}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setIsEditing(true)}>
                <Icon name="edit" size={18} color="#2196F3" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  currentValue: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  extractedContainer: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00ACC1',
  },
  extractedValue: {
    fontSize: 14,
    color: '#333',
  },
  editInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  rejectButton: {
    backgroundColor: '#ffebee',
  },
  rejectText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
    flex: 1,
    justifyContent: 'center',
  },
  editText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#00ACC1',
  },
  acceptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#00ACC1',
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
