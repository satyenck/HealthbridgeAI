/**
 * ReferralCard Component
 *
 * Displays referral information in a card format
 * Used across different screens (doctor and patient views)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Referral } from '../services/referralService';
import referralService from '../services/referralService';

interface ReferralCardProps {
  referral: Referral;
  viewType: 'made' | 'received' | 'patient'; // Which view is displaying this card
  onPress?: () => void;
  showActions?: boolean;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  referral,
  viewType,
  onPress,
  showActions = false,
}) => {
  const statusColor = referralService.getStatusColor(referral.status);
  const statusText = referralService.getStatusText(referral.status);
  const priorityColor = referralService.getPriorityColor(referral.priority);

  const getTitle = () => {
    switch (viewType) {
      case 'made':
        return `Referred to ${referral.referred_to_doctor_name}`;
      case 'received':
        return `From ${referral.referring_doctor_name}`;
      case 'patient':
        return `Referral to ${referral.referred_to_doctor_name}`;
      default:
        return 'Referral';
    }
  };

  const getSubtitle = () => {
    switch (viewType) {
      case 'made':
      case 'received':
        return `Patient: ${referral.patient_name}`;
      case 'patient':
        return `From ${referral.referring_doctor_name}`;
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        !referral.patient_viewed && viewType === 'patient' && styles.unreadCard,
        !referral.referred_doctor_viewed && viewType === 'received' && styles.unreadCard,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* Priority and Specialty */}
      <View style={styles.metaRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
          <Text style={styles.priorityText}>{referral.priority}</Text>
        </View>
        {referral.specialty_needed && (
          <Text style={styles.specialty}>{referral.specialty_needed}</Text>
        )}
      </View>

      {/* Reason */}
      <Text style={styles.reason} numberOfLines={2}>
        {referral.reason}
      </Text>

      {/* Appointment Info */}
      {referral.has_appointment && referral.appointment_scheduled_time && (
        <View style={styles.appointmentRow}>
          <Text style={styles.appointmentLabel}>📅 Appointment: </Text>
          <Text style={styles.appointmentTime}>
            {formatDate(referral.appointment_scheduled_time)}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.date}>Created {formatDate(referral.created_at)}</Text>
        {viewType === 'patient' && !referral.patient_viewed && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        {viewType === 'received' && !referral.referred_doctor_viewed && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specialty: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  reason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  appointmentLabel: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  appointmentTime: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  newBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ReferralCard;
