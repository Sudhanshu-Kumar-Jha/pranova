import React from 'react';
import { TextInput, NumberInput, BooleanInput, SelectInput, ReferenceInput, required, minValue, maxValue } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';

const genderChoices = [
  { id: 'Female', name: 'Female' },
  { id: 'Male', name: 'Male' },
  { id: 'Other', name: 'Other' },
];

const statusChoices = [
  { id: 'ACTIVE', name: 'Active, accepting appointments' },
  { id: 'ON_LEAVE', name: 'On leave' },
  { id: 'INACTIVE', name: 'Inactive' },
];

/** Shared field set for creating and editing a doctor. */
export const DoctorFormFields: React.FC = () => (
  <>
    <FormSection first title="Identity" description="How the doctor appears to patients in the app.">
      <TextInput source="firstName" label="First name" validate={required()} />
      <TextInput source="lastName" label="Last name" validate={required()} />
      <SelectInput source="gender" label="Gender" choices={genderChoices} emptyText="Prefer not to say" />
      <TextInput source="photoUrl" label="Photo URL" helperText="A square headshot works best." />
    </FormSection>

    <FormSection title="Practice" description="Specialty, credentials and experience shown on the profile.">
      <ReferenceInput source="specialtyId" reference="specialties" perPage={100} sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Specialty" validate={required()} />
      </ReferenceInput>
      <TextInput source="registrationNumber" label="Medical registration number" />
      <FullWidth>
        <TextInput source="qualifications" label="Qualifications" helperText="For example: MBBS, MD (Cardiology)" />
      </FullWidth>
      <NumberInput source="experienceYears" label="Years of experience" validate={[minValue(0), maxValue(70)]} />
      <TextInput source="languages" label="Languages" helperText="Separate with commas" />
      <TextInput source="city" label="City" />
      <FullWidth>
        <TextInput source="bio" label="Professional bio" multiline minRows={3} />
      </FullWidth>
    </FormSection>

    <FormSection title="Consultations" description="Fees are charged when a patient books in the app.">
      <FullWidth>
        <BooleanInput source="isVideoEnabled" label="Offers video consultations" />
      </FullWidth>
      <NumberInput source="consultationFeeVideo" label="Video consultation fee (₹)" validate={minValue(0)} />
      <FullWidth>
        <BooleanInput source="isAudioEnabled" label="Offers audio call consultations" />
      </FullWidth>
      <NumberInput source="consultationFeeAudio" label="Audio call fee (₹)" validate={minValue(0)} />
      <NumberInput source="consultationFeeClinic" label="In-clinic fee (₹)" validate={minValue(0)} />
    </FormSection>

    <FormSection title="Availability" description="Only active doctors can be booked." columns={1}>
      <SelectInput source="status" label="Status" choices={statusChoices} validate={required()} />
    </FormSection>
  </>
);
