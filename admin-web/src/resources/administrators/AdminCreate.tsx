import React from 'react';
import { Create, SimpleForm, TextInput, PasswordInput, required, email as emailValidator, minLength } from 'react-admin';
import { FormIntro, FormSection } from '../../ui/FormSection.js';

export const AdminCreate: React.FC = () => (
  <Create redirect="list" title="New administrator">
    <SimpleForm defaultValues={{ department: 'Operations' }}>
      <FormIntro
        title="Invite an administrator"
        description="They can sign in straight away with the email and temporary password set here. Ask them to change the password after their first sign-in."
      />
      <FormSection first title="Person" description="Used to attribute their changes in the audit log.">
        <TextInput source="firstName" label="First name" validate={required()} />
        <TextInput source="lastName" label="Last name" validate={required()} />
        <TextInput source="department" label="Department" />
      </FormSection>
      <FormSection title="Sign-in" description="Share the temporary password through a secure channel.">
        <TextInput source="email" label="Work email" type="email" validate={[required(), emailValidator()]} />
        <PasswordInput source="password" label="Temporary password" validate={[required(), minLength(8)]} helperText="At least 8 characters." />
      </FormSection>
    </SimpleForm>
  </Create>
);
