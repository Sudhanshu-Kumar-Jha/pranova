import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBrand } from '../providers/AppConfigProvider';
import { onColor } from '../theme';

interface BrandLogoProps {
  /** Height of the logo image / mark, in px. */
  size?: number;
  /** Show the configured app name next to the mark. */
  withName?: boolean;
  /** Colour for the name, when shown. */
  nameColor?: string;
}

/**
 * The administrator-configured logo. Falls back to a medical mark in the brand
 * colour when no logo is set, or when the configured image fails to load —
 * the app must never render a broken image or an empty header.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, withName = false, nameColor }) => {
  const theme = useTheme();
  const brand = useBrand();
  const [failed, setFailed] = useState(false);

  const showImage = Boolean(brand.logoUrl) && !failed;

  return (
    <View style={styles.row}>
      {showImage ? (
        <Image
          source={{ uri: brand.logoUrl }}
          style={{ height: size, width: size * 2.4, maxWidth: 170 }}
          resizeMode="contain"
          accessibilityLabel={brand.appName}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.mark,
            {
              height: size,
              width: size,
              borderRadius: size * 0.28,
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="hospital-box"
            size={size * 0.6}
            color={onColor(theme.colors.primary)}
          />
        </View>
      )}

      {withName && !showImage && (
        <Text style={[styles.name, { color: nameColor ?? theme.colors.primary, fontSize: size * 0.45 }]}>
          {brand.appName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default BrandLogo;
