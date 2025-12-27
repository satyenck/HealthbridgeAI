import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {authService} from '../services/authService';

export const LoginScreen = ({navigation}: any) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      await authService.sendPhoneCode(phoneNumber);
      setCodeSent(true);
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyPhoneCode(phoneNumber, verificationCode);

      // Navigate to role-based app screen
      const roleToScreen: {[key: string]: string} = {
        'PATIENT': 'PatientApp',
        'DOCTOR': 'DoctorApp',
        'LAB': 'LabApp',
        'PHARMACY': 'PharmacyApp',
        'ADMIN': 'AdminApp'
      };

      const screenName = roleToScreen[response.role] || 'PatientApp';
      navigation.replace(screenName as never);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Google Sign In',
      'Google authentication requires additional setup with @react-native-google-signin/google-signin package',
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HealthbridgeAI</Text>
      <Text style={styles.subtitle}>Your AI Health Companion</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1234567890"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          editable={!codeSent}
        />

        {!codeSent ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendCode}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyCode}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCodeSent(false)}>
              <Text style={styles.linkText}>Change Phone Number</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#3498db',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
});
