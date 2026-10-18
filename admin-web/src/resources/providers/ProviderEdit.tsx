import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { ProviderFormFields } from './ProviderForm.js';

const Title: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit ${r.name}` : 'Edit provider'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r?.name ?? 'Edit provider'} />;
};

export const ProviderEdit: React.FC = () => (
  <Edit redirect="show" title={<Title />}>
    <SimpleForm>
      <Intro />
      <ProviderFormFields />
    </SimpleForm>
  </Edit>
);
