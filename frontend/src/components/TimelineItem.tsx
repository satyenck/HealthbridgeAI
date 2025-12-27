import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {ComprehensiveEncounter, EncounterType} from '../types';
import {formatDateTime} from '../utils/dateHelpers';
import {hasConcerningVitals} from '../utils/vitalsHelpers';
import {StatusBadge} from './StatusBadge';

interface TimelineItemProps {
  encounter: ComprehensiveEncounter;
  onPress?: () => void;
  isLast?: boolean;
}

const getEncounterTypeIcon = (type: EncounterType): string => {
  switch (type) {
    case EncounterType.REMOTE_CONSULT:
      return '💻';
    case EncounterType.LIVE_VISIT:
      return '🏥';
    case EncounterType.INITIAL_LOG:
      return '📝';
    default:
      return '📋';
  }
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  encounter,
  onPress,
  isLast = false,
}) => {
  const hasVitals = encounter.vitals && encounter.vitals.length > 0;
  const hasLabResults = encounter.lab_results && encounter.lab_results.length > 0;
  const hasSummary = !!encounter.summary_report;
  const hasMedia = encounter.media_files && encounter.media_files.length > 0;

  const latestVitals = hasVitals ? encounter.vitals![encounter.vitals!.length - 1] : null;
  const showWarning = latestVitals ? hasConcerningVitals(latestVitals) : false;

  return (
    <View style={styles.container}>
      {/* Timeline line */}
      <View style={styles.timelineColumn}>
        <View style={[styles.dot, showWarning && styles.warningDot]} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.icon}>{getEncounterTypeIcon(encounter.encounter.encounter_type)}</Text>
            <View style={styles.headerInfo}>
              <Text style={styles.date}>{formatDateTime(encounter.encounter.created_at)}</Text>
              {encounter.doctor_info && (
                <Text style={styles.doctor}>
                  Dr. {encounter.doctor_info.first_name} {encounter.doctor_info.last_name}
                </Text>
              )}
            </View>
          </View>
          {hasSummary && encounter.summary_report && (
            <StatusBadge
              status={encounter.summary_report.status}
              type="report"
              size="small"
            />
          )}
        </View>

        {/* Summary badges */}
        <View style={styles.badges}>
          {hasVitals && (
            <View style={[styles.badge, showWarning && styles.warningBadge]}>
              <Text style={[styles.badgeText, showWarning && styles.warningBadgeText]}>
                📊 {encounter.vitals!.length} Vital{encounter.vitals!.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {hasLabResults && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                🧪 {encounter.lab_results!.length} Lab Result{encounter.lab_results!.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {hasMedia && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                📎 {encounter.media_files!.length} File{encounter.media_files!.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Summary preview */}
        {hasSummary && encounter.summary_report?.content.diagnosis && (
          <Text style={styles.summary} numberOfLines={2}>
            {encounter.summary_report.content.diagnosis}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineColumn: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  warningDot: {
    backgroundColor: '#FF9800',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  doctor: {
    fontSize: 12,
    color: '#666',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  warningBadgeText: {
    color: '#FF9800',
  },
  summary: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
