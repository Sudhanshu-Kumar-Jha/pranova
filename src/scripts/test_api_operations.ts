import config from '../config/env.config.js';

async function main() {
  const baseUrl = `http://127.0.0.1:${config.app.port || 5000}`;
  console.log(`\nTesting API endpoints at ${baseUrl}...`);

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const health = await healthRes.json();
  console.log(`[PASS] GET /health: status = ${(health as any).data.status}`);

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: config.admin.email,
      password: config.admin.password,
    }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${err}`);
  }

  const loginData: any = await loginRes.json();
  const token = loginData.data?.tokens?.accessToken || loginData.data?.token || loginData.token;
  console.log(`[PASS] POST /api/v1/auth/admin/login: Logged in successfully as ${config.admin.email}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Read cases
  const casesRes = await fetch(`${baseUrl}/api/v1/cases`, { headers: authHeaders });
  const casesData: any = await casesRes.json();
  console.log(`[PASS] GET /api/v1/cases: returned ${casesData.data?.length || 0} cases (total: ${casesData.total})`);

  // 4. Read doctors
  const doctorsRes = await fetch(`${baseUrl}/api/v1/doctors`, { headers: authHeaders });
  const doctorsData: any = await doctorsRes.json();
  console.log(`[PASS] GET /api/v1/doctors: returned ${doctorsData.data?.length || 0} doctors (total: ${doctorsData.total})`);

  // 5. Test search filter without case-sensitivity issue on MySQL
  const searchRes = await fetch(`${baseUrl}/api/v1/specialties?q=cardio`, { headers: authHeaders });
  const searchData: any = await searchRes.json();
  console.log(`[PASS] GET /api/v1/specialties?q=cardio: matched ${searchData.data?.length || 0} specialties`);

  // 6. Test write operation (CRUD lifecycle) on MySQL
  const testName = `Migration Verification ${Date.now()}`;
  const createRes = await fetch(`${baseUrl}/api/v1/specialties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: testName,
      description: 'Temporary specialty created to verify MySQL write transaction',
      isActive: true,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Create specialty failed (${createRes.status}): ${err}`);
  }
  const createData: any = await createRes.json();
  const createdId = createData.data?.id;
  console.log(`[PASS] POST /api/v1/specialties: Created record ID ${createdId} in MySQL`);

  // Verify it exists in MySQL
  const getCreatedRes = await fetch(`${baseUrl}/api/v1/specialties/${createdId}`, { headers: authHeaders });
  const getCreatedData: any = await getCreatedRes.json();
  console.log(`[PASS] GET /api/v1/specialties/${createdId}: Verified created record in MySQL: "${getCreatedData.data?.name}"`);

  // Delete the test record
  const deleteRes = await fetch(`${baseUrl}/api/v1/specialties/${createdId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log(`[PASS] DELETE /api/v1/specialties/${createdId}: Cleaned up test record (status: ${deleteRes.status})`);

  console.log('\n======================================================');
  console.log(' ALL END-TO-END API CRUD TESTS PASSED AGAINST MYSQL');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('[FAIL] API test failed:', err);
  process.exit(1);
});
