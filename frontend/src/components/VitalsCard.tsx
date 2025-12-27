import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Vitals} from '../types';
import {
  formatVital,
  formatBloodPressure,
  getVitalStatus,
  getVitalStatusColor,
} from '../utils/vitalsHelpers';
import {formatDateTime} from '../utils/dateHelpers';

interface VitalsCardProps {
  vitals: Vitals;
  showTimestamp?: boolean;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({vitals, showTimestamp = true}) => {
  const renderVitalRow = (label: string, value: string, status?: 'normal' | 'warning' | 'critical') => (
    <View style={styles.vitalRow}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text
        style={[
          styles.vitalValue,
          status && {color: getVitalStatusColor(status)},
        ]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {showTimestamp && (
        <Text style={styles.timestamp}>{formatDateTime(vitals.recorded_at)}</Text>
      )}

      {vitals.blood_pressure_sys && vitals.blood_pressure_dia && (
        renderVitalRow(
          'Blood Pressure',
          formatBloodPressure(vitals.blood_pressure_sys, vitals.blood_pressure_dia),
          getVitalStatus('blood_pressure_sys', vitals.blood_pressure_sys),
        )
      )}

      {vitals.heart_rate && (
        renderVitalRow(
          'Heart Rate',
          formatVital('heart_rate', vitals.heart_rate),
          getVitalStatus('heart_rate', vitals.heart_rate),
        )
      )}

      {vitals.oxygen_level && (
        renderVitalRow(
          'Oxygen Level',
          formatVital('oxygen_level', vitals.oxygen_level),
          getVitalStatus('oxygen_level', vitals.oxygen_level),
        )
      )}

      {vitals.temperature && (
        renderVitalRow(
          'Temperature',
          formatVital('temperature', vitals.temperature),
          getVitalStatus('temperature', vitals.temperature),
        )
      )}

      {vitals.weight && (
        renderVitalRow('Weight', formatVital('weight', vitals.weight))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  vitalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vitalLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  vitalValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
});
