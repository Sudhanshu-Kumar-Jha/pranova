import React from 'react';
import { Create, SimpleForm, TextInput, BooleanInput, required } from 'react-admin';
import { FormIntro, FormSection, FullWidth } from '../../ui/FormSection.js';

export const SpecialtyFormFields: React.FC = () => (
  <>
    <FormSection first title="Details" description="Patients browse doctors by specialty in the app." columns={1}>
      <TextInput source="name" label="Specialty name" validate={required()} helperText="For example: Cardiology" />
      <TextInput source="description" label="Short description" multiline minRows={2} helperText="One line shown under the name." />
      <TextInput source="iconKey" label="Icon key" helperText="Optional. Used by the mobile app to pick an icon, for example heart." />
    </FormSection>
    <FormSection title="Visibility" description="Hidden specialties stay on record but don't appear in the app." columns={1}>
      <FullWidth>
        <BooleanInput source="isActive" label="Show this specialty in the patient app" />
      </FullWidth>
    </FormSection>
  </>
);

export const SpecialtyCreate: React.FC = () => (
  <Create redirect="list" title="New specialty">
    <SimpleForm defaultValues={{ isActive: true }}>
      <FormIntro title="Add a specialty" />
      <SpecialtyFormFields />
    </SimpleForm>
  </Create>
);
