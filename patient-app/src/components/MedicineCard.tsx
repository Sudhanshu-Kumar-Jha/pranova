import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, IconButton, useTheme } from 'react-native-paper';
import { useCartStore } from '../store/cartStore';
import { ProductImage } from './ProductImage';
import { palette, formatINR, tint, onColor } from '../theme';
import type { Medicine } from '../api/pharmacy';

interface MedicineCardProps {
  medicine: Medicine;
}

const CATEGORY_ICON = {
  OTC: 'pill',
  PRESCRIPTION: 'prescription',
  WELLNESS: 'leaf',
  DEVICE: 'medical-bag',
} as const;

export const MedicineCard: React.FC<MedicineCardProps> = ({ medicine }) => {
  const theme = useTheme();
  const cartItem = useCartStore((s) => s.items[medicine.id]);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const quantity = cartItem?.quantity ?? 0;
  const discountPercent =
    medicine.mrp > medicine.sellingPrice
      ? Math.round(((medicine.mrp - medicine.sellingPrice) / medicine.mrp) * 100)
      : 0;

  const inStock = medicine.stock > 0;
  const lowStock = inStock && medicine.stock <= 10;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.mainRow}>
          <ProductImage
            uri={medicine.imageUrl}
            size={72}
            fallbackIcon={CATEGORY_ICON[medicine.category] ?? 'pill'}
          />

          <View style={styles.infoCol}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{medicine.category}</Text>
              </View>
              {medicine.requiresPrescription && (
                <View style={styles.rxBadge}>
                  <Text style={styles.rxText}>Rx required</Text>
                </View>
              )}
            </View>

            <Text variant="titleMedium" style={styles.brandName} numberOfLines={1}>
              {medicine.brand || medicine.name}
            </Text>
            <Text variant="bodySmall" style={styles.genericName} numberOfLines={1}>
              {medicine.name}
            </Text>
            {Boolean(medicine.form || medicine.packSize) && (
              <Text variant="bodySmall" style={styles.packSize} numberOfLines={1}>
                {[medicine.form, medicine.packSize].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceCol}>
            <View style={styles.priceRow}>
              <Text style={styles.sellingPrice}>{formatINR(medicine.sellingPrice)}</Text>
              {medicine.mrp > medicine.sellingPrice && (
                <Text style={styles.mrp}>{formatINR(medicine.mrp)}</Text>
              )}
            </View>
            {discountPercent > 0 ? (
              <Text style={styles.discountText}>{discountPercent}% off</Text>
            ) : lowStock ? (
              <Text style={styles.lowStock}>Only {medicine.stock} left</Text>
            ) : null}
          </View>

          <View style={styles.actionCol}>
            {!inStock ? (
              <Text style={styles.outOfStock}>Out of stock</Text>
            ) : quantity === 0 ? (
              <Button
                mode="contained"
                onPress={() => addItem(medicine)}
                style={styles.addBtn}
                contentStyle={{ height: 38 }}
                labelStyle={{ color: onColor(theme.colors.primary) }}
                icon="plus"
                accessibilityLabel={`Add ${medicine.name} to cart`}
              >
                Add
              </Button>
            ) : (
              <View style={[styles.quantityControl, { backgroundColor: tint(theme.colors.primary, 0.92), borderColor: tint(theme.colors.primary, 0.75) }]}>
                <IconButton
                  icon="minus"
                  size={16}
                  onPress={() => updateQuantity(medicine.id, -1)}
                  style={styles.qtyBtn}
                  iconColor={theme.colors.primary}
                  accessibilityLabel={`Remove one ${medicine.name}`}
                />
                <Text style={[styles.qtyText, { color: theme.colors.primary }]}>{quantity}</Text>
                <IconButton
                  icon="plus"
                  size={16}
                  onPress={() => updateQuantity(medicine.id, 1)}
                  style={styles.qtyBtn}
                  iconColor={theme.colors.primary}
                  disabled={quantity >= medicine.stock}
                  accessibilityLabel={`Add one more ${medicine.name}`}
                />
              </View>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderColor: palette.line,
  },
  content: {
    padding: 14,
    gap: 10,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: palette.hairline,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  rxBadge: {
    backgroundColor: palette.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rxText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.danger,
  },
  brandName: {
    fontWeight: '700',
    color: palette.ink,
  },
  genericName: {
    color: '#475569',
    marginTop: 1,
  },
  packSize: {
    color: palette.subtle,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  priceCol: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sellingPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  mrp: {
    fontSize: 12,
    color: palette.subtle,
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.success,
  },
  lowStock: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.warning,
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  addBtn: {
    borderRadius: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  qtyBtn: {
    margin: 0,
    width: 32,
    height: 32,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  outOfStock: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.danger,
  },
});

export default MedicineCard;
