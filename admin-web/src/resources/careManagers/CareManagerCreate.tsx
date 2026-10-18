import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { CareManagerFormFields } from './CareManagerForm.js';

export const CareManagerCreate: React.FC = () => (
  <Create redirect="show" title="New care manager">
    <SimpleForm defaultValues={{ isAvailable: true }}>
      <FormIntro title="Onboard a care manager" description="They can be assigned cases as soon as they're saved." />
      <CareManagerFormFields />
    </SimpleForm>
  </Create>
);
