import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { ProviderFormFields } from './ProviderForm.js';

export const ProviderCreate: React.FC = () => (
  <Create redirect="show" title="New provider">
    <SimpleForm defaultValues={{ status: 'ACTIVE', rating: 4.5, operatingHours: '24/7' }}>
      <FormIntro title="Onboard a provider" description="Hospitals, labs, clinics, pharmacies and ambulance services you coordinate with." />
      <ProviderFormFields />
    </SimpleForm>
  </Create>
);
