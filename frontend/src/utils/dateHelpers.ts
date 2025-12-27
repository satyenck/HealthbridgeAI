import {format, parseISO, formatDistanceToNow, isValid} from 'date-fns';

/**
 * Format ISO date string to readable format
 */
export const formatDate = (dateString: string, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr) : 'Invalid date';
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format date to time only
 */
export const formatTime = (dateString: string): string => {
  return formatDate(dateString, 'h:mm a');
};

/**
 * Format date to full datetime
 */
export const formatDateTime = (dateString: string): string => {
  return formatDate(dateString, 'MMM dd, yyyy h:mm a');
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? formatDistanceToNow(date, {addSuffix: true}) : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Format date of birth to age
 */
export const calculateAge = (dateOfBirth: string): number => {
  try {
    const dob = parseISO(dateOfBirth);
    if (!isValid(dob)) return 0;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    return 0;
  }
};

/**
 * Format date of birth to "Age X" string
 */
export const formatAge = (dateOfBirth: string): string => {
  const age = calculateAge(dateOfBirth);
  return age > 0 ? `${age} years` : 'Unknown';
};

/**
 * Check if date is today
 */
export const isToday = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Parse input date string to Date object
 */
export const parseInputDate = (dateString: string): Date | null => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    return null;
  }
};
