import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { PatientFormFields } from './PatientForm.js';

const name = (r: any) => r?.fullName || `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim();

const Title: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit ${name(r)}` : 'Edit patient'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r ? name(r) : 'Edit patient'} />;
};

export const PatientEdit: React.FC = () => (
  <Edit redirect="show" title={<Title />}>
    <SimpleForm>
      <Intro />
      <PatientFormFields />
    </SimpleForm>
  </Edit>
);
