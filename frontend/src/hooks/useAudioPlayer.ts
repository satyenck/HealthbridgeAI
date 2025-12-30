import {useState, useEffect, useRef} from 'react';
import {Audio} from 'expo-av';
import {Alert} from 'react-native';

interface UseAudioPlayerReturn {
  isLoading: boolean;
  isPlaying: boolean;
  duration: number;
  position: number;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  loadAudio: (uri: string) => Promise<void>;
  unloadAudio: () => Promise<void>;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async (uri: string) => {
    try {
      setIsLoading(true);

      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load new sound
      const {sound: newSound} = await Audio.Sound.createAsync(
        {uri},
        {shouldPlay: false},
        onPlaybackStatusUpdate,
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const play = async () => {
    if (!sound) {
      Alert.alert('Error', 'Audio not loaded');
      return;
    }

    try {
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const pause = async () => {
    if (!sound) return;

    try {
      await sound.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const stop = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setIsPlaying(false);
      setPosition(0);
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const unloadAudio = async () => {
    if (!sound) return;

    try {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setDuration(0);
      setPosition(0);
    } catch (error) {
      console.error('Error unloading audio:', error);
    }
  };

  return {
    isLoading,
    isPlaying,
    duration,
    position,
    play,
    pause,
    stop,
    loadAudio,
    unloadAudio,
  };
};
