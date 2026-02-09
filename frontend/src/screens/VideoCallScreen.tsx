/**
 * Video Call Screen
 * Handles real-time video consultation using Agora RTC
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  joinVideoCall,
  endVideoCall,
  VideoCallCredentials,
} from '../services/videoConsultationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VideoCallScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { consultationId } = route.params as { consultationId: string };

  const agoraEngineRef = useRef<IRtcEngine>();
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [credentials, setCredentials] = useState<VideoCallCredentials | null>(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      cleanupAgora();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isJoined) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isJoined]);

  const initializeAgora = async () => {
    try {
      setLoading(true);

      // Determine user type from stored role
      const role = await AsyncStorage.getItem('userRole');
      const userType = role === 'DOCTOR' ? 'doctor' : 'patient';

      // Get video call credentials from backend
      const creds = await joinVideoCall(consultationId, userType);
      setCredentials(creds);

      // Create Agora engine
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;

      // Initialize engine
      engine.initialize({
        appId: creds.app_id,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Register event handlers
      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('Successfully joined channel');
          setIsJoined(true);
        },
        onUserJoined: (_connection, uid) => {
          console.log('Remote user joined:', uid);
          setRemoteUid(uid);
        },
        onUserOffline: (_connection, uid) => {
          console.log('Remote user left:', uid);
          setRemoteUid(0);
        },
        onError: (err, msg) => {
          console.error('Agora Error:', err, msg);
          Alert.alert('Error', `Connection error: ${msg}`);
        },
      });

      // Enable video
      engine.enableVideo();

      // Start preview
      engine.startPreview();

      // Set client role
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Join channel
      engine.joinChannel(creds.token, creds.channel_name, creds.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      setLoading(false);
    } catch (error: any) {
      console.error('Failed to initialize Agora:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to join video call',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setLoading(false);
    }
  };

  const cleanupAgora = async () => {
    try {
      if (agoraEngineRef.current) {
        await agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      }
    } catch (error) {
      console.error('Error cleaning up Agora:', error);
    }
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this video consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            try {
              await endVideoCall(consultationId);
              await cleanupAgora();
              navigation.goBack();
            } catch (error: any) {
              console.error('Error ending call:', error);
              // Still go back even if API call fails
              await cleanupAgora();
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const toggleAudio = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalAudioStream(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalVideoStream(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const toggleSpeaker = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.setEnableSpeakerphone(!isSpeakerOn);
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const switchCamera = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.switchCamera();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Connecting to video call...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote Video (Full Screen) */}
      {isJoined && remoteUid > 0 ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.waitingText}>Waiting for the other participant to join...</Text>
        </View>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {isJoined && !isVideoMuted && (
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            canvas={{ uid: credentials?.uid || 0, sourceType: VideoSourceType.VideoSourceCamera }}
            style={styles.localVideo}
          />
        </View>
      )}

      {/* Call Duration */}
      {isJoined && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isAudioMuted && styles.controlButtonActive]}
          onPress={toggleAudio}
        >
          <Text style={styles.controlIcon}>{isAudioMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlLabel}>{isAudioMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isVideoMuted && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Text style={styles.controlIcon}>{isVideoMuted ? '📹' : '🎥'}</Text>
          <Text style={styles.controlLabel}>{isVideoMuted ? 'Start Video' : 'Stop Video'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={switchCamera}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlLabel}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.controlIcon}>{isSpeakerOn ? '🔊' : '🔉'}</Text>
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Text style={styles.controlIcon}>📞</Text>
          <Text style={styles.controlLabel}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  durationContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
  },
  endCallButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default VideoCallScreen;
