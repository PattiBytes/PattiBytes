import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Audio } from 'expo-av';

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
let sound: Audio.Sound | null = null;
export async function playNotificationSound() {
  try {
    if (sound) {
      await sound.unloadAsync();
    }
    
    const { sound: newSound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/notification.mp3'),
      { shouldPlay: true }
    );
    sound = newSound;
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export async function cleanup() {
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }
}
export default async function registerForPushNotifications(userId?: string) {
  let token: string | undefined;

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Check if device supports push notifications
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      
      // Save token to Supabase if userId provided
      if (userId && token) {
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);
      }
      
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for push notifications');
  }

  return token;
}
