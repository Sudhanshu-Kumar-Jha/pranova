import React from 'react';
import { List, FunctionField, SearchInput, SelectInput } from 'react-admin';
import { Box, Typography } from '@mui/material';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { ImageThumb } from '../../ui/ProductImageInput.js';
import { formatINR, humanize, color } from '../../design/tokens.js';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search by name, brand or manufacturer" />,
  <SelectInput
    key="category"
    source="category"
    label="Category"
    choices={[
      { id: 'OTC', name: 'Over the counter' },
      { id: 'PRESCRIPTION', name: 'Prescription' },
      { id: 'WELLNESS', name: 'Wellness' },
      { id: 'DEVICE', name: 'Device' },
    ]}
  />,
];

const LOW_STOCK = 20;

const Stock: React.FC<{ n: number }> = ({ n }) => {
  if (n <= 0) return <ToneChip tone="error">Out of stock</ToneChip>;
  if (n <= LOW_STOCK) return <ToneChip tone="warning">{n} left</ToneChip>;
  return <Typography variant="body2" className="num">{n}</Typography>;
};

const Price: React.FC<{ mrp: number; price: number }> = ({ mrp, price }) => (
  <Box sx={{ textAlign: 'right' }}>
    <Typography variant="body2" className="num" sx={{ fontWeight: 600 }}>{formatINR(price)}</Typography>
    {mrp > price && (
      <Typography variant="caption" className="num" sx={{ color: color.subtle, textDecoration: 'line-through' }}>{formatINR(mrp)}</Typography>
    )}
  </Box>
);

const categoryLabel = (c: string) => (c === 'OTC' ? 'Over the counter' : humanize(c));

export const MedicineList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'name', order: 'ASC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<MedicationOutlinedIcon />} title="The catalogue is empty" description="Add medicines so patients can order them from the pharmacy in the app." />}
  >
    <ResponsiveDatagrid
      rowClick="edit"
      mobile={{
        leftAvatar: (r: any) => <ImageThumb src={r.imageUrl} size={40} alt="" />,
        primaryText: (r: any) => r.name,
        secondaryText: (r: any) => facts(r.brand, r.packSize, formatINR(r.sellingPrice)),
        tertiaryText: (r: any) => <Stock n={r.stock} />,
      }}
    >
      <FunctionField
        label="Product"
        sortBy="name"
        render={(r: any) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <ImageThumb src={r.imageUrl} size={40} alt="" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary" component="div">{facts(r.brand, r.form, r.packSize)}</Typography>
            </Box>
          </Box>
        )}
      />
      <FunctionField label="Category" sortBy="category" render={(r: any) => <Typography variant="body2">{categoryLabel(r.category)}</Typography>} />
      <FunctionField
        label="Prescription"
        sortable={false}
        render={(r: any) => (r.requiresPrescription ? <ToneChip tone="info">Required</ToneChip> : <Typography variant="body2" color="text.secondary">Not required</Typography>)}
      />
      <FunctionField label="Price" sortBy="sellingPrice" textAlign="right" render={(r: any) => <Price mrp={r.mrp} price={r.sellingPrice} />} />
      <FunctionField label="Stock" sortBy="stock" render={(r: any) => <Stock n={r.stock} />} />
      <FunctionField label="Listing" sortable={false} render={(r: any) => <ToneChip tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Listed' : 'Unlisted'}</ToneChip>} />
    </ResponsiveDatagrid>
  </List>
);
