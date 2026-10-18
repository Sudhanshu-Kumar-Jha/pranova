import React from 'react';
import { Show, useRecordContext } from 'react-admin';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, facts } from '../../ui/Panel.js';
import { ImageThumb } from '../../ui/ProductImageInput.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { StatusWorkflow } from '../../ui/StatusWorkflow.js';
import { formatINR, formatDateTime, plural, color } from '../../design/tokens.js';
import { LocationLink } from '../../ui/LocationLink.js';

const FLOW: Record<string, string[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const ACTIONS: Record<string, string> = {
  CONFIRMED: 'Confirm order',
  PACKED: 'Mark as packed',
  OUT_FOR_DELIVERY: 'Send for delivery',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
};

const OrderTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Order ${r.orderNumber}` : 'Order'}</span>;
};

const SummaryRow: React.FC<{ label: string; value: string; strong?: boolean; muted?: boolean }> = ({ label, value, strong, muted }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" color={muted ? 'text.secondary' : 'text.primary'} sx={{ fontWeight: strong ? 600 : 400 }}>{label}</Typography>
    <Typography variant="body2" className="num" sx={{ fontWeight: strong ? 700 : 500 }}>{value}</Typography>
  </Box>
);

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;
  const items: any[] = r.items ?? [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={r.orderNumber}
          status={<StatusChip value={r.status} />}
          subtitle={facts(`Placed ${formatDateTime(r.placedAt)}`, plural(items.length, 'item'), formatINR(r.totalAmount))}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Payment"><StatusChip value={r.paymentStatus} size="sm" /></InfoItem>
            <InfoItem label="Paid by">{r.paymentMethod === 'ONLINE' ? 'Online payment' : 'Cash on delivery'}</InfoItem>
            <InfoItem label="Contact">{r.phone}</InfoItem>
            <InfoItem label="City">{facts(r.city, r.pincode)}</InfoItem>
            <InfoItem label="Delivered">{r.deliveredAt ? formatDateTime(r.deliveredAt) : null}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Items" padded={false}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Order items">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <ImageThumb src={it.medicine?.imageUrl} size={36} alt="" />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{it.medicine?.name}</Typography>
                            {it.medicine?.brand && <Typography variant="caption" color="text.secondary" component="div">{it.medicine.brand}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell align="right">{formatINR(it.unitPrice)}</TableCell>
                      <TableCell align="right">{formatINR(it.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${color.lineSoft}`, ml: 'auto', width: { xs: '100%', sm: 320 } }}>
              <SummaryRow label="Subtotal" value={formatINR(r.subtotal)} />
              {r.discount > 0 && <SummaryRow label="Savings on MRP" value={`− ${formatINR(r.discount)}`} muted />}
              <SummaryRow label="Delivery" value={r.deliveryFee > 0 ? formatINR(r.deliveryFee) : 'Free'} />
              <Box sx={{ borderTop: `1px solid ${color.lineSoft}`, mt: 1, pt: 1 }}>
                <SummaryRow label="Total" value={formatINR(r.totalAmount)} strong />
              </Box>
            </Box>
          </Panel>

          <Panel title="Delivery">
            <InfoGrid columns={2}>
              <InfoItem label="Address" full>
                <LocationLink
                  label="Delivery address"
                  address={r.deliveryAddress}
                  city={r.city}
                  pincode={r.pincode}
                  emptyText="No delivery address recorded"
                />
              </InfoItem>
              <InfoItem label="Notes" full>{r.notes}</InfoItem>
            </InfoGrid>
          </Panel>
        </Box>

        <StatusWorkflow
          endpoint={`/orders/${r.id}/status`}
          current={r.status}
          flow={FLOW}
          actionLabels={ACTIONS}
          destructive={['CANCELLED']}
          entityName="order"
        />
      </Box>
    </Box>
  );
};

export const OrderShow: React.FC = () => (
  <Show component="div" title={<OrderTitle />} actions={false}>
    <Content />
  </Show>
);
