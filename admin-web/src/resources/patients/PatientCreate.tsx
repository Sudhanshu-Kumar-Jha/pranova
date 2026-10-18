import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { PatientFormFields } from './PatientForm.js';

export const PatientCreate: React.FC = () => (
  <Create redirect="show" title="New patient">
    <SimpleForm>
      <FormIntro title="Register a patient" description="Patients can also sign up themselves in the mobile app with their phone number." />
      <PatientFormFields />
    </SimpleForm>
  </Create>
);
