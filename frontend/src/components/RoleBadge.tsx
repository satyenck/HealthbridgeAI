import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {UserRole} from '../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium';
}

const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case UserRole.PATIENT:
      return '#2196F3'; // Blue
    case UserRole.DOCTOR:
      return '#00ACC1'; // Green
    case UserRole.LAB:
      return '#9C27B0'; // Purple
    case UserRole.PHARMACY:
      return '#FF9800'; // Orange
    case UserRole.ADMIN:
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
};

const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case UserRole.PATIENT:
      return 'Patient';
    case UserRole.DOCTOR:
      return 'Doctor';
    case UserRole.LAB:
      return 'Lab';
    case UserRole.PHARMACY:
      return 'Pharmacy';
    case UserRole.ADMIN:
      return 'Admin';
    default:
      return role;
  }
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({role, size = 'medium'}) => {
  const color = getRoleColor(role);
  const label = getRoleLabel(role);
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
