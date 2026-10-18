import React from 'react';
import { Edit, SimpleForm, useRecordContext } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { DoctorFormFields } from './DoctorForm.js';

const DoctorTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Edit Dr. ${r.firstName} ${r.lastName}` : 'Edit doctor'}</span>;
};

const Intro: React.FC = () => {
  const r = useRecordContext();
  return <FormIntro title={r ? `Dr. ${r.firstName} ${r.lastName}` : 'Edit doctor'} description="Changes are visible to patients as soon as you save." />;
};

export const DoctorEdit: React.FC = () => (
  <Edit mutationMode="pessimistic" redirect="show" title={<DoctorTitle />}>
    <SimpleForm>
      <Intro />
      <DoctorFormFields />
    </SimpleForm>
  </Edit>
);
