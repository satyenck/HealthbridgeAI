import React, {useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {labService} from '../../services/labService';
import {OrderStatus} from '../../types';

export const UploadResultsScreen = ({route, navigation}: any) => {
  const {orderId} = route.params;
  const [results, setResults] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!results.trim()) {
      Alert.alert('Error', 'Please enter test results');
      return;
    }

    try {
      setUploading(true);
      const metrics = JSON.parse(results);
      await labService.uploadResults(orderId, metrics);
      await labService.updateOrderStatus(orderId, OrderStatus.COMPLETED);
      Alert.alert('Success', 'Results uploaded successfully', [
        {text: 'OK', onPress: () => navigation.navigate('OrdersListMain')},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload results. Make sure JSON is valid.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Lab Results</Text>
      <Text style={styles.hint}>Enter results as JSON format:</Text>
      <TextInput
        style={styles.input}
        value={results}
        onChangeText={setResults}
        placeholder='{"hemoglobin": 14.5, "wbc": 7200, ...}'
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Upload & Complete Order</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f5f5f5'},
  title: {fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8},
  hint: {fontSize: 14, color: '#666', marginBottom: 16},
  input: {backgroundColor: '#fff', borderRadius: 8, padding: 12, height: 200, textAlignVertical: 'top', fontSize: 14, marginBottom: 16},
  button: {backgroundColor: '#9C27B0', padding: 16, borderRadius: 8, alignItems: 'center'},
  buttonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
});
