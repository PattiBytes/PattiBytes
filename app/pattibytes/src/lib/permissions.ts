import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { supabase } from './supabase';

export type PermissionType = 'location' | 'notifications' | 'camera' | 'storage';
export type PermissionStatus = 'granted' | 'denied' | 'pending';

async function trackPermission(userId: string, type: PermissionType, status: PermissionStatus) {
  await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      permission_type: type,
      status,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,permission_type'
    });
}

export async function requestLocationPermission(userId: string, reason?: string): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus === 'granted') {
      await trackPermission(userId, 'location', 'granted');
      return true;
    }

    if (reason) {
      return new Promise((resolve) => {
        Alert.alert('Location Permission', reason, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: async () => resolve(await continueLocationRequest()) }
        ]);
      });
    }

    return await continueLocationRequest();

    async function continueLocationRequest() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      await trackPermission(userId, 'location', granted ? 'granted' : 'denied');
      
      if (!granted) {
        showPermissionDeniedAlert('Location', 'find nearby restaurants');
      }
      
      return granted;
    }
  } catch (error) {
    console.error('Location permission error:', error);
    return false;
  }
}

export async function requestNotificationPermission(userId: string, reason?: string): Promise<boolean> {
  try {
    const existingStatus = await Notifications.getPermissionsAsync();
    
    if (existingStatus.granted) {
      await trackPermission(userId, 'notifications', 'granted');
      return true;
    }

    if (reason) {
      return new Promise((resolve) => {
        Alert.alert('Notification Permission', reason, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Enable', onPress: async () => resolve(await continueNotificationRequest()) }
        ]);
      });
    }

    return await continueNotificationRequest();

    async function continueNotificationRequest() {
      const result = await Notifications.requestPermissionsAsync();
      const granted = result.granted;
      await trackPermission(userId, 'notifications', granted ? 'granted' : 'denied');
      
      if (!granted) {
        showPermissionDeniedAlert('Notifications', 'receive order updates');
      }
      
      return granted;
    }
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
}

export async function requestCameraPermission(userId: string, reason?: string): Promise<boolean> {
  try {
    const existingStatus = await ImagePicker.getCameraPermissionsAsync();
    
    if (existingStatus.granted) {
      await trackPermission(userId, 'camera', 'granted');
      return true;
    }

    if (reason) {
      return new Promise((resolve) => {
        Alert.alert('Camera Permission', reason, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Allow', onPress: async () => resolve(await continueCameraRequest()) }
        ]);
      });
    }

    return await continueCameraRequest();

    async function continueCameraRequest() {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      const granted = result.granted;
      await trackPermission(userId, 'camera', granted ? 'granted' : 'denied');
      
      if (!granted) {
        showPermissionDeniedAlert('Camera', 'take photos');
      }
      
      return granted;
    }
  } catch (error) {
    console.error('Camera permission error:', error);
    return false;
  }
}

export async function requestMediaLibraryPermission(userId: string, reason?: string): Promise<boolean> {
  try {
    const existingStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (existingStatus.granted) {
      await trackPermission(userId, 'storage', 'granted');
      return true;
    }

    if (reason) {
      return new Promise((resolve) => {
        Alert.alert('Photo Library Permission', reason, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Allow', onPress: async () => resolve(await continueMediaRequest()) }
        ]);
      });
    }

    return await continueMediaRequest();

    async function continueMediaRequest() {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = result.granted;
      await trackPermission(userId, 'storage', granted ? 'granted' : 'denied');
      
      if (!granted) {
        showPermissionDeniedAlert('Photo Library', 'upload images');
      }
      
      return granted;
    }
  } catch (error) {
    console.error('Media library permission error:', error);
    return false;
  }
}

function showPermissionDeniedAlert(permissionName: string, purpose: string) {
  Alert.alert(
    `${permissionName} Access Denied`,
    `Please enable ${permissionName} permission in Settings to ${purpose}.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  );
}

export async function getCurrentLocation(userId: string) {
  const hasPermission = await requestLocationPermission(
    userId,
    'We need your location to show nearby restaurants and accurate delivery estimates.'
  );
  
  if (!hasPermission) return null;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude
    };
  } catch (error) {
    console.error('Get location error:', error);
    return null;
  }
}
