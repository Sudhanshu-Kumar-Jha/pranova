import React from 'react';
import { TextInput, BooleanInput, required, email } from 'react-admin';
import { FormSection, FullWidth } from '../../ui/FormSection.js';

/** Shared field set for onboarding and editing a care manager. */
export const CareManagerFormFields: React.FC = () => (
  <>
    <FormSection first title="Person" description="They sign in to the Care Manager app with this phone number.">
      <TextInput source="firstName" label="First name" validate={required()} />
      <TextInput source="lastName" label="Last name" validate={required()} />
      <TextInput source="phone" label="Mobile number" validate={required()} helperText="Include the country code, for example +919876543210." />
      <TextInput source="email" label="Work email" type="email" validate={email()} />
    </FormSection>

    <FormSection title="Role" description="Shown to the operations team when assigning cases.">
      <TextInput source="employeeCode" label="Employee code" helperText="For example: CM-1024" />
      <TextInput source="licenseNumber" label="Clinical licence number" />
      <TextInput source="specialization" label="Specialization" helperText="For example: Cardiac triage" />
      <TextInput source="assignedZone" label="Zone" helperText="The area they usually cover." />
    </FormSection>

    <FormSection title="Availability" columns={1}>
      <FullWidth>
        <BooleanInput source="isAvailable" label="On duty and available for dispatch" />
      </FullWidth>
    </FormSection>
  </>
);
