import {Vitals} from '../types';

/**
 * Vital sign ranges and validation
 */

export interface VitalRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

export const VITAL_RANGES: Record<string, VitalRange> = {
  blood_pressure_sys: {min: 90, max: 180, unit: 'mmHg', label: 'Systolic BP'},
  blood_pressure_dia: {min: 60, max: 120, unit: 'mmHg', label: 'Diastolic BP'},
  heart_rate: {min: 40, max: 200, unit: 'bpm', label: 'Heart Rate'},
  oxygen_level: {min: 70, max: 100, unit: '%', label: 'SpO2'},
  weight: {min: 20, max: 300, unit: 'kg', label: 'Weight'},
  temperature: {min: 35, max: 42, unit: '°C', label: 'Temperature'},
};

/**
 * Normal ranges for vitals
 */
export const NORMAL_RANGES: Record<string, {min: number; max: number}> = {
  blood_pressure_sys: {min: 90, max: 120},
  blood_pressure_dia: {min: 60, max: 80},
  heart_rate: {min: 60, max: 100},
  oxygen_level: {min: 95, max: 100},
  weight: {min: 40, max: 120}, // Varies widely, just for reference
  temperature: {min: 36.1, max: 37.2},
};

/**
 * Validate a vital sign value
 */
export const isValidVital = (vitalName: keyof typeof VITAL_RANGES, value: number): boolean => {
  const range = VITAL_RANGES[vitalName];
  if (!range) return false;
  return value >= range.min && value <= range.max;
};

/**
 * Check if a vital is in normal range
 */
export const isNormalVital = (vitalName: keyof typeof NORMAL_RANGES, value: number): boolean => {
  const range = NORMAL_RANGES[vitalName];
  if (!range) return true; // If no range defined, assume normal
  return value >= range.min && value <= range.max;
};

/**
 * Get status color for a vital
 */
export const getVitalStatus = (
  vitalName: keyof typeof NORMAL_RANGES,
  value: number,
): 'normal' | 'warning' | 'critical' => {
  const range = NORMAL_RANGES[vitalName];
  if (!range) return 'normal';

  if (value < range.min || value > range.max) {
    // Critical if significantly outside range
    const criticalLow = range.min * 0.9;
    const criticalHigh = range.max * 1.1;
    if (value < criticalLow || value > criticalHigh) {
      return 'critical';
    }
    return 'warning';
  }

  return 'normal';
};

/**
 * Get color for vital status
 */
export const getVitalStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'normal':
      return '#4CAF50'; // Green
    case 'warning':
      return '#FF9800'; // Orange
    case 'critical':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
};

/**
 * Format vital value with unit
 */
export const formatVital = (vitalName: keyof typeof VITAL_RANGES, value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';

  const range = VITAL_RANGES[vitalName];
  if (!range) return value.toString();

  // Special formatting for blood pressure
  if (vitalName === 'blood_pressure_sys' || vitalName === 'blood_pressure_dia') {
    return `${value} ${range.unit}`;
  }

  // Special formatting for temperature (1 decimal place)
  if (vitalName === 'temperature') {
    return `${value.toFixed(1)}${range.unit}`;
  }

  return `${value} ${range.unit}`;
};

/**
 * Format blood pressure as "sys/dia mmHg"
 */
export const formatBloodPressure = (sys: number | null | undefined, dia: number | null | undefined): string => {
  if (sys === null || sys === undefined || dia === null || dia === undefined) {
    return 'N/A';
  }
  return `${sys}/${dia} mmHg`;
};

/**
 * Get all vital values from a Vitals object as formatted strings
 */
export const formatAllVitals = (vitals: Vitals): Record<string, string> => {
  return {
    blood_pressure: formatBloodPressure(vitals.blood_pressure_sys, vitals.blood_pressure_dia),
    heart_rate: formatVital('heart_rate', vitals.heart_rate),
    oxygen_level: formatVital('oxygen_level', vitals.oxygen_level),
    weight: formatVital('weight', vitals.weight),
    temperature: formatVital('temperature', vitals.temperature),
  };
};

/**
 * Check if vitals object has any concerning values
 */
export const hasConcerningVitals = (vitals: Vitals): boolean => {
  const checks = [
    {name: 'blood_pressure_sys' as const, value: vitals.blood_pressure_sys},
    {name: 'blood_pressure_dia' as const, value: vitals.blood_pressure_dia},
    {name: 'heart_rate' as const, value: vitals.heart_rate},
    {name: 'oxygen_level' as const, value: vitals.oxygen_level},
    {name: 'temperature' as const, value: vitals.temperature},
  ];

  return checks.some(check => {
    if (check.value === null || check.value === undefined) return false;
    const status = getVitalStatus(check.name, check.value);
    return status === 'warning' || status === 'critical';
  });
};

/**
 * Validate vitals input data
 */
export const validateVitalsInput = (vitals: Partial<Vitals>): {valid: boolean; errors: string[]} => {
  const errors: string[] = [];

  // Check if at least one vital is provided
  const hasAnyVital =
    vitals.blood_pressure_sys !== undefined ||
    vitals.blood_pressure_dia !== undefined ||
    vitals.heart_rate !== undefined ||
    vitals.oxygen_level !== undefined ||
    vitals.weight !== undefined ||
    vitals.temperature !== undefined;

  if (!hasAnyVital) {
    errors.push('At least one vital sign must be provided');
  }

  // Validate blood pressure (both values required if one is provided)
  if (
    (vitals.blood_pressure_sys !== undefined && vitals.blood_pressure_dia === undefined) ||
    (vitals.blood_pressure_dia !== undefined && vitals.blood_pressure_sys === undefined)
  ) {
    errors.push('Both systolic and diastolic blood pressure values are required');
  }

  // Validate each vital if provided
  Object.entries(vitals).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key in VITAL_RANGES) {
      const vitalName = key as keyof typeof VITAL_RANGES;
      if (!isValidVital(vitalName, value as number)) {
        const range = VITAL_RANGES[vitalName];
        errors.push(`${range.label} must be between ${range.min} and ${range.max} ${range.unit}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
