import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Navigate, Route } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider.js';
import { authProvider } from './providers/authProvider.js';
import { lightTheme, darkTheme } from './theme.js';
import { CustomLogin } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';
import { CustomLayout } from './components/Layout.js';
import { CustomError } from './components/CustomError.js';
import { BrandingSettings } from './components/BrandingSettings.js';
import { BrandingProvider } from './branding.js';

// Resources
import cases from './resources/cases/index.js';
import patients from './resources/patients/index.js';
import careManagers from './resources/careManagers/index.js';
import providers from './resources/providers/index.js';
import specialties from './resources/specialties/index.js';
import doctors from './resources/doctors/index.js';
import appointments from './resources/appointments/index.js';
import medicines from './resources/medicines/index.js';
import orders from './resources/orders/index.js';
import diagnosticTests from './resources/diagnosticTests/index.js';
import labBookings from './resources/labBookings/index.js';
import administrators from './resources/administrators/index.js';
import documents from './resources/documents/index.js';

// Icons (one family: MUI Outlined)
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';

/**
 * The dashboard has its own `/dashboard` slug (registered in CustomRoutes).
 * React-Admin still needs a `dashboard` prop to claim the root path, so the
 * bare root forwards there — one canonical URL for the landing page.
 */
const DashboardRedirect: React.FC = () => <Navigate to="/dashboard" replace />;

export const App: React.FC = () => {
  return (
    <BrandingProvider>
    <Admin
      title="PRANOVA"
      dataProvider={dataProvider}
      authProvider={authProvider}
      theme={lightTheme}
      darkTheme={darkTheme}
      defaultTheme="light"
      loginPage={CustomLogin}
      dashboard={DashboardRedirect}
      layout={CustomLayout}
      error={CustomError}
      requireAuth
    >
      <Resource
        name="cases"
        options={{ label: 'Cases' }}
        icon={MonitorHeartOutlinedIcon}
        list={cases.list}
        show={cases.show}
        create={cases.create}
      />
      <Resource
        name="providers"
        options={{ label: 'Providers' }}
        icon={LocalHospitalOutlinedIcon}
        list={providers.list}
        show={providers.show}
        create={providers.create}
        edit={providers.edit}
      />
      <Resource
        name="patients"
        options={{ label: 'Patients' }}
        icon={PeopleAltOutlinedIcon}
        list={patients.list}
        show={patients.show}
        create={patients.create}
        edit={patients.edit}
      />
      <Resource
        name="documents"
        options={{ label: 'Medical documents' }}
        icon={FolderSharedOutlinedIcon}
        list={documents.list}
        show={documents.show}
      />
      <Resource
        name="care-managers"
        options={{ label: 'Care managers' }}
        icon={BadgeOutlinedIcon}
        list={careManagers.list}
        show={careManagers.show}
        create={careManagers.create}
        edit={careManagers.edit}
      />
      <Resource
        name="specialties"
        options={{ label: 'Specialties' }}
        icon={CategoryOutlinedIcon}
        list={specialties.list}
        create={specialties.create}
        edit={specialties.edit}
      />
      <Resource
        name="doctors"
        options={{ label: 'Doctors' }}
        icon={MedicalServicesOutlinedIcon}
        list={doctors.list}
        show={doctors.show}
        create={doctors.create}
        edit={doctors.edit}
      />
      <Resource
        name="appointments"
        options={{ label: 'Appointments' }}
        icon={EventAvailableOutlinedIcon}
        list={appointments.list}
        show={appointments.show}
      />
      <Resource
        name="medicines"
        options={{ label: 'Medicines' }}
        icon={MedicationOutlinedIcon}
        list={medicines.list}
        create={medicines.create}
        edit={medicines.edit}
      />
      <Resource
        name="orders"
        options={{ label: 'Orders' }}
        icon={ReceiptLongOutlinedIcon}
        list={orders.list}
        show={orders.show}
      />
      <Resource
        name="diagnostic-tests"
        options={{ label: 'Test catalogue' }}
        icon={ScienceOutlinedIcon}
        list={diagnosticTests.list}
        create={diagnosticTests.create}
        edit={diagnosticTests.edit}
      />
      <Resource
        name="lab-bookings"
        options={{ label: 'Lab bookings' }}
        icon={BiotechOutlinedIcon}
        list={labBookings.list}
        show={labBookings.show}
      />
      <Resource
        name="admins"
        options={{ label: 'Administrators' }}
        icon={AdminPanelSettingsOutlinedIcon}
        list={administrators.list}
        create={administrators.create}
      />
      <CustomRoutes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<BrandingSettings />} />
      </CustomRoutes>
    </Admin>
    </BrandingProvider>
  );
};

export default App;
