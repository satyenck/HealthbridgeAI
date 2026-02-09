import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Encounter, EncounterType, InputMethod, ReportStatus, DoctorProfile} from '../types';
import {formatDateTime, formatRelativeTime} from '../utils/dateHelpers';
import {StatusBadge} from './StatusBadge';

interface EncounterCardProps {
  encounter: Encounter;
  reportStatus?: ReportStatus;
  doctorInfo?: DoctorProfile;
  onPress?: () => void;
}

const getEncounterTypeLabel = (type: EncounterType): string => {
  switch (type) {
    case EncounterType.REMOTE_CONSULT:
      return 'Remote';
    case EncounterType.LIVE_VISIT:
      return 'Live Visit';
    case EncounterType.INITIAL_LOG:
      return 'Initial Log';
    default:
      return type;
  }
};

const getEncounterTypeColor = (type: EncounterType): string => {
  switch (type) {
    case EncounterType.REMOTE_CONSULT:
      return '#2196F3'; // Blue
    case EncounterType.LIVE_VISIT:
      return '#00ACC1'; // Green
    case EncounterType.INITIAL_LOG:
      return '#FF9800'; // Orange
    default:
      return '#9E9E9E'; // Gray
  }
};

const getInputMethodIcon = (method?: InputMethod): string => {
  if (!method) return '';
  switch (method) {
    case InputMethod.VOICE:
      return '🎤';
    case InputMethod.MANUAL:
      return '⌨️';
    default:
      return '';
  }
};

export const EncounterCard: React.FC<EncounterCardProps> = ({encounter, reportStatus, doctorInfo, onPress}) => {
  const typeColor = getEncounterTypeColor(encounter.encounter_type);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, {backgroundColor: typeColor}]}>
          <Text style={styles.typeBadgeText}>
            {getEncounterTypeLabel(encounter.encounter_type)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {reportStatus && <StatusBadge status={reportStatus} type="report" />}
          {encounter.input_method && (
            <Text style={styles.inputMethod}>
              {getInputMethodIcon(encounter.input_method)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.id}>ID: {encounter.encounter_id.substring(0, 8)}...</Text>
        <Text style={styles.date}>{formatDateTime(encounter.created_at)}</Text>
        <Text style={styles.relativeTime}>
          {formatRelativeTime(encounter.created_at)}
        </Text>
      </View>

      {encounter.doctor_id && doctorInfo && (
        <View style={styles.footer}>
          <Text style={styles.doctorLabel}>
            Doctor: Dr. {doctorInfo.first_name} {doctorInfo.last_name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputMethod: {
    fontSize: 20,
  },
  content: {
    marginBottom: 8,
  },
  id: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  relativeTime: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  doctorLabel: {
    fontSize: 12,
    color: '#00ACC1',
    fontWeight: '500',
  },
});
