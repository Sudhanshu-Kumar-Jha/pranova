import React from 'react';
import { List, FunctionField, NumberField, SearchInput, SelectInput, ReferenceInput, TextField } from 'react-admin';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid, RowEditButton } from '../../ui/ResponsiveDatagrid.js';
import { PersonCell, facts } from '../../ui/Panel.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { formatINR } from '../../design/tokens.js';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search doctors or specialties" />,
  <ReferenceInput key="specialtyId" source="specialtyId" reference="specialties" label="Specialty">
    <SelectInput optionText="name" label="Specialty" />
  </ReferenceInput>,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'ACTIVE', name: 'Active' },
      { id: 'ON_LEAVE', name: 'On leave' },
      { id: 'INACTIVE', name: 'Inactive' },
    ]}
  />,
];

const name = (r: any) => `Dr. ${r.firstName} ${r.lastName}`;

export const DoctorList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'rating', order: 'DESC' }}
    perPage={10}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<MedicalServicesOutlinedIcon />} title="No doctors yet" description="Onboard doctors so patients can find and book them in the app." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => name(r),
        secondaryText: (r: any) => facts(r.specialty?.name, `${r.experienceYears} yrs`, r.city),
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField
        label="Doctor"
        sortBy="firstName"
        render={(r: any) => (
          <PersonCell name={name(r)} secondary={facts(r.specialty?.name, `${r.experienceYears} yrs experience`, r.city)} src={r.photoUrl} />
        )}
      />
      <FunctionField label="Video fee" sortBy="consultationFeeVideo" textAlign="right" render={(r: any) => (r.isVideoEnabled ? formatINR(r.consultationFeeVideo) : 'Not offered')} />
      <FunctionField label="Audio fee" sortBy="consultationFeeAudio" textAlign="right" render={(r: any) => (r.isAudioEnabled ? formatINR(r.consultationFeeAudio || r.consultationFeeVideo) : 'Not offered')} />
      <FunctionField label="Clinic fee" sortBy="consultationFeeClinic" textAlign="right" render={(r: any) => formatINR(r.consultationFeeClinic)} />
      <NumberField source="rating" label="Rating" options={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
      <TextField source="registrationNumber" label="Registration" emptyText="—" sortable={false} />
      <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
      <RowEditButton />
    </ResponsiveDatagrid>
  </List>
);
