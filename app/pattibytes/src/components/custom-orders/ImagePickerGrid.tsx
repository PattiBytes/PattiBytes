// src/components/custom-orders/ImagePickerGrid.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { S } from './styles';

// ── Cloudinary config ────────────────────────────────────────────────────────
// Add these to your .env / eas.json env blocks:
//   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
//   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
const CLOUD_NAME    = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET ?? '';

async function uploadToCloudinary(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary env vars not set.');
  }

  // Read file as blob — works on both iOS and Android
  const response = await fetch(localUri);
  const blob     = await response.blob();

  const formData = new FormData();
  // React Native requires the file object format below
  formData.append('file', {
    uri:  localUri,
    type: blob.type || 'image/jpeg',
    name: `custom_order_${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'custom_orders');  // optional — organises in Cloudinary

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  // secure_url is always HTTPS — safe to store in Supabase
  return data.secure_url as string;
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  // ✅ imageUris now holds Cloudinary URLs (https://...), not local file:// paths
  imageUris: string[];
  onChange:  (uris: string[]) => void;
};

export function ImagePickerGrid({ imageUris, onChange }: Props) {
  // Track which slots are currently uploading (by index)
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (imageUris.length >= 3) {
      Alert.alert('Limit reached', 'Maximum 3 images allowed.');
      return;
    }

    // Request permission on iOS
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo library access in Settings to attach images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // ✅ mediaTypes array format — replaces deprecated MediaTypeOptions.Images
      mediaTypes: ['images'],
      quality:    0.75,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    setUploading(true);

    try {
      const cloudUrl = await uploadToCloudinary(localUri);
      // ✅ Store the Cloudinary URL — not the local device path
      onChange([...imageUris, cloudUrl]);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number) => {
    Alert.alert('Remove photo?', 'This will remove the photo from your request.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onChange(imageUris.filter((_, i) => i !== idx)),
      },
    ]);
  };

  return (
    <View style={S.section}>
      <Text style={S.secLabel}>
        Reference photos{' '}
        <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional, max 3)</Text>
      </Text>
      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 10 }}>
        Tap a photo to remove it
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {imageUris.map((uri, idx) => (
          <TouchableOpacity
            key={uri}                        // ✅ use URI as key — stable & unique
            onPress={() => remove(idx)}      // ✅ tap to remove (long-press is easy to miss)
            onLongPress={() => remove(idx)}  // keep long-press too
            style={S.imgThumb}
            activeOpacity={0.8}
          >
            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
            <View style={S.imgOverlay}>
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center' }}>
                TAP TO{'\n'}REMOVE
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Upload slot — shows spinner while uploading */}
        {imageUris.length < 3 && (
          <TouchableOpacity
            style={S.addImgBtn}
            onPress={pickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#9CA3AF" />
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                  Uploading…
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 32, color: '#D1D5DB' }}>+</Text>
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                  Add photo
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}