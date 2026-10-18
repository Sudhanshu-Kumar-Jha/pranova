import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Searchbar,
  SegmentedButtons,
  Chip,
  Card,
  Button,
  Snackbar,
  Divider,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listMedicines, listMyOrders, MedicineOrder } from '../../src/api/pharmacy';
import { useCartStore } from '../../src/store/cartStore';
import { formatINR, palette } from '../../src/theme';
import { MedicineCard } from '../../src/components/MedicineCard';
import { StatusChip } from '../../src/components/StatusChip';
import { CartCheckoutModal } from '../../src/components/CartCheckoutModal';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { CardSkeleton, ProductCardSkeleton } from '../../src/components/LoadingSkeleton';

export default function PharmacyScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<'catalog' | 'orders'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const cartItemCount = useCartStore((s) => s.getItemCount());
  const cartSubtotal = useCartStore((s) => s.getSubtotal());

  // Queries
  const medicinesQuery = useQuery({
    queryKey: ['medicines', { q: searchQuery, category: selectedCategory }],
    queryFn: () =>
      listMedicines({
        q: searchQuery.trim() || undefined,
        category: selectedCategory,
        perPage: 30,
      }),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => listMyOrders({ perPage: 30 }),
  });

  const isRefreshing =
    mainTab === 'catalog' ? medicinesQuery.isRefetching : ordersQuery.isRefetching;

  const onRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleOrderSuccess = (orderNumber: string) => {
    setSnackbarMessage(`Order placed successfully! Reference: ${orderNumber}`);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setMainTab('orders');
  };

  const categories = [
    { label: 'All', value: undefined },
    { label: 'OTC', value: 'OTC' },
    { label: 'Prescription', value: 'PRESCRIPTION' },
    { label: 'Wellness', value: 'WELLNESS' },
    { label: 'Device', value: 'DEVICE' },
  ];

  return (
    <View style={styles.root}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'catalog' | 'orders')}
          buttons={[
            {
              value: 'catalog',
              label: 'Medicine Catalog',
              icon: 'pill',
            },
            {
              value: 'orders',
              label: ordersQuery.isError
                ? 'My Orders'
                : `My Orders (${ordersQuery.data?.data.length || 0})`,
              icon: 'truck-delivery-outline',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {mainTab === 'catalog' ? (
          <>
            <Searchbar
              placeholder="Search by brand or salt..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              inputStyle={{ minHeight: 44 }}
            />

            {/* Category filter chips */}
            <View style={styles.categorySection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <Chip
                      key={cat.label}
                      selected={isSelected}
                      onPress={() => setSelectedCategory(cat.value)}
                      style={[styles.chip, isSelected && styles.selectedChip]}
                    >
                      {cat.label}
                    </Chip>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.resultsHeader}>
              <Text variant="titleSmall" style={styles.resultsCount}>
                {medicinesQuery.isError
                  ? 'Catalog Offline'
                  : `${medicinesQuery.data?.total ?? 0} Products Found`}
              </Text>
            </View>

            {medicinesQuery.isLoading ? (
              <>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </>
            ) : medicinesQuery.isError ? (
              <NetworkErrorState
                title="Pharmacy Catalog Offline"
                message="Cannot connect to medicine catalog. Check your connection and tap retry."
                onRetry={() => void medicinesQuery.refetch()}
              />
            ) : medicinesQuery.data?.data.length === 0 ? (
              <EmptyState
                icon="pill"
                title="No Medicines Found"
                description="We couldn't find medicines matching your search. Try adjusting the filter or search keywords."
                actionLabel="Clear Filter"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory(undefined);
                }}
              />
            ) : (
              medicinesQuery.data?.data.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} />
              ))
            )}
          </>
        ) : (
          <>
            {ordersQuery.isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : ordersQuery.isError ? (
              <NetworkErrorState
                title="Orders Offline"
                message="Cannot retrieve your order history. Check your connection and tap retry."
                onRetry={() => void ordersQuery.refetch()}
              />
            ) : ordersQuery.data?.data.length === 0 ? (
              <EmptyState
                icon="package-variant-closed"
                title="No Orders Yet"
                description="You haven't placed any pharmacy orders yet. Browse genuine healthcare products in the catalog."
                actionLabel="Browse Catalog"
                onAction={() => setMainTab('catalog')}
              />
            ) : (
              ordersQuery.data?.data.map((order: MedicineOrder) => {
                const dateStr = new Date(order.placedAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <Card key={order.id} style={styles.orderCard} mode="outlined">
                    <Card.Content style={styles.orderContent}>
                      <View style={styles.orderHeader}>
                        <View>
                          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                          <Text style={styles.orderDate}>{dateStr}</Text>
                        </View>
                        <StatusChip status={order.status} />
                      </View>

                      <Divider style={{ marginVertical: 8 }} />

                      {/* Items summary */}
                      <View style={styles.orderItems}>
                        {order.items.map((item) => (
                          <View key={item.id} style={styles.orderItemRow}>
                            <Text style={styles.orderItemName} numberOfLines={1}>
                              {item.medicine?.brand || 'Medicine'} × {item.quantity}
                            </Text>
                            <Text style={styles.orderItemPrice}>₹{item.lineTotal}</Text>
                          </View>
                        ))}
                      </View>

                      <Divider style={{ marginVertical: 8 }} />

                      <View style={styles.orderFooter}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addressLabel}>Delivering to:</Text>
                          <Text style={styles.addressText} numberOfLines={1}>
                            {order.deliveryAddress}
                          </Text>
                        </View>
                        <Text style={styles.orderTotal}>₹{order.totalAmount}</Text>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Cart Checkout Bar */}
      {cartItemCount > 0 && mainTab === 'catalog' && (
        <View style={styles.floatingCart}>
          <TouchableOpacity
            style={[styles.cartBar, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
            onPress={() => setCheckoutVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.cartInfo}>
              <View style={styles.cartCountBadge}>
                <Text style={[styles.cartCountText, { color: theme.colors.primary }]}>{cartItemCount}</Text>
              </View>
              <Text style={styles.cartSubtotalText}>{formatINR(cartSubtotal)}</Text>
            </View>
            <View style={styles.cartAction}>
              <Text style={styles.cartActionText}>View cart and check out</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart & Checkout Modal */}
      <CartCheckoutModal
        visible={checkoutVisible}
        onDismiss={() => setCheckoutVisible(false)}
        onSuccess={handleOrderSuccess}
      />

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
        style={{ backgroundColor: '#0f766e' }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  searchbar: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 0,
  },
  categorySection: {
    marginVertical: 4,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedChip: {
    backgroundColor: '#ecfdf5',
    borderColor: '#34d399',
  },
  resultsHeader: {
    marginVertical: 4,
  },
  resultsCount: {
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.info,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: palette.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountBadge: {
    backgroundColor: '#ffffff',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.info,
  },
  cartSubtotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  orderCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 15,
  },
  orderDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderItems: {
    gap: 6,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addressLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.info,
  },
});
