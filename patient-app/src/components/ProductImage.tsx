import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '../theme';

interface ProductImageProps {
  uri?: string | null;
  size?: number;
  /** Icon shown when there is no usable image. */
  fallbackIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
}

/**
 * A catalogue photo with a graceful placeholder. Product images are optional
 * in the admin console, and a hosted URL can rot, so every image needs a
 * fallback that still reads as the right kind of product.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  uri,
  size = 64,
  fallbackIcon = 'pill',
  style,
}) => {
  const [failed, setFailed] = useState(false);
  const show = Boolean(uri) && !failed;

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.18 }, style]}>
      {show ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <MaterialCommunityIcons name={fallbackIcon} size={size * 0.44} color={palette.subtle} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: palette.canvas,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default ProductImage;
