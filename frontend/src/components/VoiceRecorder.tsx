import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {voiceService, RecordingResult} from '../services/voiceService';
import {formatDuration} from '../utils/audioHelpers';

interface VoiceRecorderProps {
  onRecordingComplete: (result: RecordingResult) => void;
  onError?: (error: Error) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1000);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      await voiceService.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      const result = await voiceService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      onRecordingComplete(result);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordingButton,
        ]}
        onPress={handleToggleRecording}
        disabled={isProcessing}
        activeOpacity={0.7}>
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <View style={styles.recordButtonInner}>
            <Text style={styles.recordIcon}>
              {isRecording ? '⏹' : '🎤'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {isRecording && (
        <View style={styles.recordingInfo}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
          <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
        </View>
      )}

      {!isRecording && (
        <Text style={styles.instruction}>
          Tap to start recording
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  recordButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    fontSize: 36,
  },
  recordingInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
  duration: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  instruction: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
