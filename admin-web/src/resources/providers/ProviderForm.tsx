import React from 'react';
import { TextInput, SelectInput, NumberInput, required, email, minValue, maxValue } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';

const TYPE_CHOICES = [
  { id: 'HOSPITAL', name: 'Hospital' },
  { id: 'LAB', name: 'Diagnostic lab' },
  { id: 'CLINIC', name: 'Specialty clinic' },
  { id: 'AMBULANCE', name: 'Ambulance service' },
  { id: 'PHARMACY', name: 'Pharmacy' },
];

const STATUS_CHOICES = [
  { id: 'ACTIVE', name: 'Active' },
  { id: 'PAUSED', name: 'Paused' },
  { id: 'DEACTIVATED', name: 'Deactivated' },
];

/** Shared field set for onboarding and editing a provider facility. */
export const ProviderFormFields: React.FC = () => (
  <>
    <FormSection first title="Facility" description="The partner organisation cases can be routed to.">
      <FullWidth>
        <TextInput source="name" label="Facility name" validate={required()} />
      </FullWidth>
      <SelectInput source="type" label="Type" choices={TYPE_CHOICES} validate={required()} />
      <TextInput source="licenseNumber" label="Healthcare licence number" />
      <NumberInput source="rating" label="Rating (0–5)" validate={[minValue(0), maxValue(5)]} />
      <SelectInput source="status" label="Status" choices={STATUS_CHOICES} validate={required()} />
    </FormSection>

    <FormSection title="Contact" description="Who the operations team calls about a case.">
      <TextInput source="phone" label="Phone" validate={required()} helperText="Include the country code." />
      <TextInput source="email" label="Email" type="email" validate={email()} />
      <TextInput source="contactPerson" label="Contact person" />
      <TextInput source="operatingHours" label="Operating hours" helperText="For example: 24/7 or 08:00 to 20:00" />
    </FormSection>

    <FormSection title="Location" columns={3}>
      <FullWidth>
        <TextInput source="address" label="Street address" validate={required()} multiline minRows={2} />
      </FullWidth>
      <TextInput source="city" label="City" validate={required()} />
      <TextInput source="state" label="State" validate={required()} />
      <TextInput source="pincode" label="Pincode" validate={required()} />
    </FormSection>
  </>
);
