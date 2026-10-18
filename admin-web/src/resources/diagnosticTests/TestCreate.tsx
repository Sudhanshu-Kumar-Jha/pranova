import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { TestFormFields } from './TestForm.js';

export const TestCreate: React.FC = () => (
  <Create redirect="list" title="New diagnostic test">
    <SimpleForm defaultValues={{ reportTimeHours: 24, homeCollectionAvailable: true, isActive: true }}>
      <FormIntro title="Add a diagnostic test" description="Patients can book it once it's listed." />
      <TestFormFields />
    </SimpleForm>
  </Create>
);
