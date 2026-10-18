import React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { FormIntro } from '../../ui/FormSection.js';
import { DoctorFormFields } from './DoctorForm.js';

export const DoctorCreate: React.FC = () => (
  <Create redirect="show" title="New doctor">
    <SimpleForm defaultValues={{ status: 'ACTIVE', isVideoEnabled: true, isAudioEnabled: true, experienceYears: 0, consultationFeeVideo: 0, consultationFeeAudio: 0, consultationFeeClinic: 0 }}>
      <FormIntro title="Onboard a doctor" description="The doctor becomes bookable in the patient app once saved as active." />
      <DoctorFormFields />
    </SimpleForm>
  </Create>
);
