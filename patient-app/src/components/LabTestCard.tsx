import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DiagnosticTest } from '../api/diagnostics';

interface LabTestCardProps {
  test: DiagnosticTest;
  onBook: (test: DiagnosticTest) => void;
}

export const LabTestCard: React.FC<LabTestCardProps> = ({ test, onBook }) => {
  const discountPercent =
    test.mrp > test.sellingPrice
      ? Math.round(((test.mrp - test.sellingPrice) / test.mrp) * 100)
      : 0;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <Chip compact style={styles.categoryChip}>
            {test.category}
          </Chip>
          {test.homeCollectionAvailable && (
            <View style={styles.homeBadge}>
              <MaterialCommunityIcons name="home-outline" size={12} color="#059669" />
              <Text style={styles.homeText}>Home Sample</Text>
            </View>
          )}
        </View>

        <View style={styles.titleSection}>
          <Text variant="titleMedium" style={styles.testName}>
            {test.name}
          </Text>
          <Text variant="bodySmall" style={styles.codeText}>
            Code: {test.code}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="needle" size={14} color="#64748b" />
            <Text style={styles.detailText}>{test.sampleType}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{test.reportTimeHours}h Turnaround</Text>
          </View>
        </View>

        {test.preparation && (
          <View style={styles.prepBox}>
            <MaterialCommunityIcons name="information-outline" size={13} color="#0f766e" />
            <Text style={styles.prepText} numberOfLines={1}>
              {test.preparation}
            </Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.priceCol}>
            <View style={styles.priceRow}>
              <Text style={styles.sellingPrice}>₹{test.sellingPrice}</Text>
              {test.mrp > test.sellingPrice && (
                <Text style={styles.mrp}>₹{test.mrp}</Text>
              )}
            </View>
            {discountPercent > 0 && (
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            )}
          </View>

          <Button
            mode="contained"
            onPress={() => onBook(test)}
            style={styles.bookBtn}
            contentStyle={{ height: 38 }}
            icon="calendar-plus"
          >
            Book Test
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    backgroundColor: '#f1f5f9',
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  homeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  titleSection: {
    marginTop: 2,
  },
  testName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  codeText: {
    color: '#64748b',
    marginTop: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  prepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prepText: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '600',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    color: '#0f172a',
  },
  mrp: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  bookBtn: {
    borderRadius: 8,
    backgroundColor: '#0f766e',
  },
});
