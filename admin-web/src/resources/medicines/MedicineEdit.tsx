import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { MedicineFormFields } from './MedicineForm.js';

const Title: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit ${r.name}` : 'Edit medicine'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r?.name ?? 'Edit medicine'} description="Price and stock changes apply to new orders." />;
};

export const MedicineEdit: React.FC = () => (
  <Edit mutationMode="pessimistic" redirect="list" title={<Title />}>
    <SimpleForm>
      <Intro />
      <MedicineFormFields />
    </SimpleForm>
  </Edit>
);
