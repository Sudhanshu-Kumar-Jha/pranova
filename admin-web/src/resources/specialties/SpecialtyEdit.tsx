import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { SpecialtyFormFields } from './SpecialtyCreate.js';

const Title: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit ${r.name}` : 'Edit specialty'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r?.name ?? 'Edit specialty'} />;
};

export const SpecialtyEdit: React.FC = () => (
  <Edit mutationMode="pessimistic" redirect="list" title={<Title />}>
    <SimpleForm>
      <Intro />
      <SpecialtyFormFields />
    </SimpleForm>
  </Edit>
);
