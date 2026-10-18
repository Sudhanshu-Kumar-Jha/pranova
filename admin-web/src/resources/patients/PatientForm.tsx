import React from 'react';
import { TextInput, SelectInput, DateInput, required, email } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ id: g, name: g }));

/** Shared field set for registering and editing a patient. */
export const PatientFormFields: React.FC = () => (
  <>
    <FormSection first title="Patient" description="Basic identity and contact details.">
      <TextInput source="firstName" label="First name" validate={required()} />
      <TextInput source="lastName" label="Last name" validate={required()} />
      <TextInput source="phone" label="Mobile number" validate={required()} helperText="Include the country code, for example +919876543210." />
      <TextInput source="email" label="Email" type="email" validate={email()} />
    </FormSection>

    <FormSection title="Health profile" description="Shared with care managers during emergencies." columns={3}>
      <SelectInput
        source="gender"
        label="Gender"
        choices={[
          { id: 'Female', name: 'Female' },
          { id: 'Male', name: 'Male' },
          { id: 'Other', name: 'Other' },
        ]}
      />
      <SelectInput source="bloodGroup" label="Blood group" choices={BLOOD_GROUPS} />
      <DateInput source="dateOfBirth" label="Date of birth" />
    </FormSection>

    <FormSection title="Address" description="Used to dispatch care managers to the right place." columns={3}>
      <FullWidth>
        <TextInput source="primaryAddress" label="Street address" multiline minRows={2} />
      </FullWidth>
      <TextInput source="city" label="City" />
      <TextInput source="state" label="State" />
      <TextInput source="pincode" label="Pincode" />
    </FormSection>

    <FormSection title="Emergency contact" description="Who we call if the patient can't be reached.">
      <TextInput source="emergencyContactName" label="Contact name" />
      <TextInput source="emergencyContactPhone" label="Contact phone" />
    </FormSection>
  </>
);
