import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Priority} from '../types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'small' | 'medium';
}

const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case Priority.HIGH:
      return '#F44336'; // Red
    case Priority.MEDIUM:
      return '#FF9800'; // Orange
    case Priority.LOW:
      return '#4CAF50'; // Green
    default:
      return '#9E9E9E'; // Gray
  }
};

const getPriorityLabel = (priority: Priority): string => {
  switch (priority) {
    case Priority.HIGH:
      return 'High Priority';
    case Priority.MEDIUM:
      return 'Medium';
    case Priority.LOW:
      return 'Low';
    default:
      return priority;
  }
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'medium',
}) => {
  const color = getPriorityColor(priority);
  const label = getPriorityLabel(priority);
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, {backgroundColor: color}, isSmall && styles.smallContainer]}>
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
