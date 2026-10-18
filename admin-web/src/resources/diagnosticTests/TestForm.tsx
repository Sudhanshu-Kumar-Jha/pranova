import React from 'react';
import { TextInput, NumberInput, BooleanInput, required, minValue } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';

/** Shared field set for creating and editing a diagnostic test. */
export const TestFormFields: React.FC = () => (
  <>
    <FormSection first title="Test" description="How the test is listed in the patient app.">
      <FullWidth>
        <TextInput source="name" label="Test name" validate={required()} helperText="For example: Complete Blood Count (CBC)" />
      </FullWidth>
      <TextInput source="code" label="Test code" />
      <TextInput source="category" label="Category" helperText="Hematology, Biochemistry…" />
      <TextInput source="sampleType" label="Sample type" helperText="Blood, urine, swab…" />
      <NumberInput source="reportTimeHours" label="Report turnaround (hours)" validate={minValue(1)} />
      <FullWidth>
        <TextInput source="preparation" label="Patient preparation" helperText="For example: 12 hours fasting required" />
      </FullWidth>
      <FullWidth>
        <TextInput source="description" label="Description" multiline minRows={3} />
      </FullWidth>
    </FormSection>

    <FormSection title="Pricing" description="Patients pay the selling price.">
      <NumberInput source="mrp" label="MRP (₹)" validate={[required(), minValue(0)]} />
      <NumberInput source="sellingPrice" label="Selling price (₹)" validate={[required(), minValue(0)]} />
    </FormSection>

    <FormSection title="Collection and listing" columns={1}>
      <BooleanInput source="homeCollectionAvailable" label="Home sample collection available" />
      <BooleanInput source="isActive" label="Listed in the patient app" />
    </FormSection>
  </>
);
