import React from 'react';
import { Create, SimpleForm, TextInput, SelectInput, ReferenceInput, required } from 'react-admin';
import { FormIntro, FormSection, FullWidth } from '../../ui/FormSection.js';

export const CaseCreate: React.FC = () => (
  <Create redirect="show" title="New case">
    <SimpleForm defaultValues={{ priority: 'P2' }}>
      <FormIntro
        title="Open a case"
        description="Use this for coordination requests that didn't come in through the SOS button. You can assign a care manager after saving."
      />
      <FormSection first title="Case" description="Priority decides how the case is triaged.">
        <FullWidth>
          <TextInput source="title" label="Title" validate={required()} helperText="A short summary, for example: Post-operative home visit" />
        </FullWidth>
        <SelectInput
          source="priority"
          label="Priority"
          validate={required()}
          choices={[
            { id: 'P1', name: 'P1 Emergency' },
            { id: 'P2', name: 'P2 Urgent' },
            { id: 'P3', name: 'P3 Routine' },
          ]}
        />
        <FullWidth>
          <TextInput source="description" label="Clinical notes" multiline minRows={3} helperText="What happened and what the patient needs." />
        </FullWidth>
      </FormSection>

      <FormSection title="Patient and location" description="Who needs help, and where.">
        <ReferenceInput source="patientId" reference="patients" perPage={100}>
          <SelectInput optionText="fullName" label="Patient" validate={required()} />
        </ReferenceInput>
        <ReferenceInput source="providerId" reference="providers" perPage={100}>
          <SelectInput optionText="name" label="Facility (optional)" emptyText="No facility yet" />
        </ReferenceInput>
        <FullWidth>
          <TextInput source="incidentAddress" label="Pickup or incident address" />
        </FullWidth>
      </FormSection>
    </SimpleForm>
  </Create>
);
