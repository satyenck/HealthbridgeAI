import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ReportStatus, OrderStatus} from '../types';

interface StatusBadgeProps {
  status: ReportStatus | OrderStatus;
  type: 'report' | 'order';
  size?: 'small' | 'medium';
}

const getStatusColor = (status: ReportStatus | OrderStatus): string => {
  switch (status) {
    // Report statuses
    case 'GENERATED':
      return '#2196F3'; // Blue
    case 'PENDING_REVIEW':
      return '#FF9800'; // Orange
    case 'REVIEWED':
      return '#4CAF50'; // Green

    // Order statuses
    case 'SENT':
      return '#2196F3'; // Blue
    case 'RECEIVED':
      return '#FF9800'; // Orange
    case 'COMPLETED':
      return '#4CAF50'; // Green

    default:
      return '#9E9E9E'; // Gray
  }
};

const getStatusLabel = (status: ReportStatus | OrderStatus): string => {
  switch (status) {
    case 'GENERATED':
      return 'In Progress';
    case 'PENDING_REVIEW':
      return 'Pending Review';
    case 'REVIEWED':
      return 'Reviewed';
    case 'SENT':
      return 'Sent';
    case 'RECEIVED':
      return 'Received';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status;
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  size = 'medium',
}) => {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: color},
        isSmall && styles.smallContainer,
      ]}>
      <Text style={[styles.text, isSmall && styles.smallText]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  smallContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});
