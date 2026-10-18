import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { TestFormFields } from './TestForm.js';

const Title: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit ${r.name}` : 'Edit test'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r?.name ?? 'Edit test'} description="Price changes apply to new bookings." />;
};

export const TestEdit: React.FC = () => (
  <Edit mutationMode="pessimistic" redirect="list" title={<Title />}>
    <SimpleForm>
      <Intro />
      <TestFormFields />
    </SimpleForm>
  </Edit>
);
