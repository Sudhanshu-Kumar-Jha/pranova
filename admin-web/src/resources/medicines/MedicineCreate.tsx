import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { MedicineFormFields } from './MedicineForm.js';

export const MedicineCreate: React.FC = () => (
  <Create redirect="list" title="New medicine">
    <SimpleForm defaultValues={{ category: 'OTC', stock: 0, requiresPrescription: false, isActive: true }}>
      <FormIntro title="Add a medicine" description="It appears in the patient app's pharmacy once listed." />
      <MedicineFormFields />
    </SimpleForm>
  </Create>
);
