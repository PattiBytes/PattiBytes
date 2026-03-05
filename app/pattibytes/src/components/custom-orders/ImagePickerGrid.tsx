// app/pattibytes/src/components/custom-orders/ImagePickerGrid.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { S } from './styles';

type Props = {
  imageUris: string[];
  onChange: (uris: string[]) => void;
};

export function ImagePickerGrid({ imageUris, onChange }: Props) {
  const pickImage = async () => {
    if (imageUris.length >= 3) {
      alert('Max 3 images allowed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      onChange([...imageUris, result.assets[0].uri]);
    }
  };

  const remove = (idx: number) => {
    onChange(imageUris.filter((_, i) => i !== idx));
  };

  return (
    <View style={S.section}>
      <Text style={S.secLabel}>
        Reference photos{' '}
        <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional, max 3)</Text>
      </Text>
      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 10 }}>
        Long‑press a photo to remove it
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {imageUris.map((uri, idx) => (
          <TouchableOpacity
            key={idx}
            onLongPress={() => remove(idx)}
            style={S.imgThumb}
            activeOpacity={0.8}
          >
            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
            <View style={S.imgOverlay}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                HOLD TO{'\n'}REMOVE
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {imageUris.length < 3 && (
          <TouchableOpacity style={S.addImgBtn} onPress={pickImage} activeOpacity={0.7}>
            <Text style={{ fontSize: 32, color: '#D1D5DB' }}>+</Text>
            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Add photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
