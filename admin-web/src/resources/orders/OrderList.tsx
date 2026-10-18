import React from 'react';
import { List, FunctionField, SelectInput } from 'react-admin';
import { Typography } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { formatINR, formatDateTime, plural } from '../../design/tokens.js';

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    alwaysOn
    choices={[
      { id: 'PLACED', name: 'Placed' },
      { id: 'CONFIRMED', name: 'Confirmed' },
      { id: 'PACKED', name: 'Packed' },
      { id: 'OUT_FOR_DELIVERY', name: 'Out for delivery' },
      { id: 'DELIVERED', name: 'Delivered' },
      { id: 'CANCELLED', name: 'Cancelled' },
    ]}
  />,
];

const itemsSummary = (r: any) => {
  const items = r.items ?? [];
  if (!items.length) return 'No items';
  const first = items[0]?.medicine?.name ?? 'Item';
  return items.length === 1 ? first : `${first} and ${plural(items.length - 1, 'more item')}`;
};

export const OrderList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'placedAt', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<ReceiptLongOutlinedIcon />} title="No orders yet" description="Pharmacy orders placed in the patient app will appear here for fulfilment." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => r.orderNumber,
        secondaryText: (r: any) => facts(itemsSummary(r), formatINR(r.totalAmount)),
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField
        label="Order"
        sortBy="placedAt"
        render={(r: any) => (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary" className="num">{formatDateTime(r.placedAt)}</Typography>
          </>
        )}
      />
      <FunctionField label="Items" sortable={false} render={(r: any) => <Typography variant="body2">{itemsSummary(r)}</Typography>} />
      <FunctionField
        label="Deliver to"
        sortable={false}
        render={(r: any) => (
          <>
            <Typography variant="body2">{facts(r.city, r.pincode) || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{r.phone}</Typography>
          </>
        )}
      />
      <FunctionField label="Total" sortBy="totalAmount" textAlign="right" render={(r: any) => <Typography variant="body2" className="num" sx={{ fontWeight: 600 }}>{formatINR(r.totalAmount)}</Typography>} />
      <FunctionField label="Payment" sortable={false} render={(r: any) => <StatusChip value={r.paymentStatus} size="sm" />} />
      <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
    </ResponsiveDatagrid>
  </List>
);
