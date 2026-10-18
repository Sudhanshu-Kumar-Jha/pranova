import React from 'react';
import { TextInput, NumberInput, BooleanInput, SelectInput, required, minValue } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';
import { ProductImageInput } from '../../ui/ProductImageInput.js';

const categoryChoices = [
  { id: 'OTC', name: 'Over the counter' },
  { id: 'PRESCRIPTION', name: 'Prescription' },
  { id: 'WELLNESS', name: 'Wellness' },
  { id: 'DEVICE', name: 'Device' },
];

/** Shared field set for creating and editing a pharmacy product. */
export const MedicineFormFields: React.FC = () => (
  <>
    <FormSection first title="Product" description="What patients see when they search the pharmacy.">
      <FullWidth>
        <TextInput source="name" label="Product name" validate={required()} helperText="Include the strength, for example Paracetamol 500mg." />
      </FullWidth>
      <TextInput source="brand" label="Brand" />
      <TextInput source="manufacturer" label="Manufacturer" />
      <SelectInput source="category" label="Category" choices={categoryChoices} validate={required()} />
      <TextInput source="form" label="Form" helperText="Tablet, syrup, capsule…" />
      <TextInput source="packSize" label="Pack size" helperText="For example: 10 tablets" />
      <FullWidth>
        <ProductImageInput
          source="imageUrl"
          label="Product photo"
          helperText="Shown on the product card and in the cart in the patient app. A square image on a white background works best."
        />
      </FullWidth>
      <FullWidth>
        <TextInput source="description" label="Description" multiline minRows={3} />
      </FullWidth>
    </FormSection>

    <FormSection title="Pricing and stock" description="Patients pay the selling price. The difference from MRP is recorded as savings on each order.">
      <NumberInput source="mrp" label="MRP (₹)" validate={[required(), minValue(0)]} />
      <NumberInput source="sellingPrice" label="Selling price (₹)" validate={[required(), minValue(0)]} />
      <NumberInput source="stock" label="Units in stock" validate={minValue(0)} helperText="Orders reduce stock automatically." />
    </FormSection>

    <FormSection title="Rules and listing" columns={1}>
      <BooleanInput source="requiresPrescription" label="Requires a prescription" />
      <BooleanInput source="isActive" label="Listed in the patient app" />
    </FormSection>
  </>
);
