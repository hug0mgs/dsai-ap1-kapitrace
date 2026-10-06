import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, TestServer } from '../test-helper';

describe('E2E End-to-End Workflow: Security Operations Center (SOC) Lifecycle', () => {
  let server: TestServer;
  let sessionToken = '';
  let analystId = '';
  const analystEmail = `soc_lead_${Date.now()}@kapitrace.sec`;
  const analystPassword = 'SOC_Master_Key_2026!';

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = await startTestServer();
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  it('Step 1: System Health Inspection', async () => {
    const res = await server.fetch('/health');
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.ok(body.timestamp);
  });

  it('Step 2: Security Analyst Onboarding & Authentication', async () => {
    // 1. Register analyst
    const regRes = await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: analystEmail,
        password: analystPassword,
        name: 'Chief SOC Analyst',
        role: 'analyst'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const regData = await regRes.json();
    analystId = regData.userId;
    assert.ok(analystId);

    // 2. Login to obtain session token
    const loginRes = await server.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: analystEmail,
        password: analystPassword
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.strictEqual(loginData.user.email, analystEmail);
    sessionToken = loginData.token;
  });

  it('Step 3: Multi-Vector Threat Intelligence Search & Cache Lifecycle', async () => {
    // A. Query a malicious domain
    const targetDomain = `c2-malware-feed-${Date.now()}.org`;

    // 1. First lookup triggers Cache MISS and API evaluation
    const lookup1 = await server.fetch(`/api/lookup/domain/${targetDomain}`);
    assert.strictEqual(lookup1.status, 200);
    const data1 = await lookup1.json();
    assert.strictEqual(data1.source, 'api');
    assert.strictEqual(data1.indicator, targetDomain);
    assert.ok(typeof data1.threatScore === 'number');
    assert.ok(data1.riskLevel);

    // 2. Immediate second lookup returns Cache HIT
    const lookup2 = await server.fetch(`/api/lookup/domain/${targetDomain}`);
    assert.strictEqual(lookup2.status, 200);
    const data2 = await lookup2.json();
    assert.strictEqual(data2.source, 'cache');
    assert.strictEqual(data2.indicator, targetDomain);
    assert.strictEqual(data2.threatScore, data1.threatScore);

    // B. Query a file hash (SHA-256)
    const targetHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hashRes = await server.fetch(`/api/lookup/hash/${targetHash}`);
    assert.strictEqual(hashRes.status, 200);
    const hashData = await hashRes.json();
    assert.strictEqual(hashData.type, 'hash');
    assert.ok(typeof hashData.threatScore === 'number');

    // C. Query an IPv4 address
    const targetIp = '198.51.100.99';
    const ipRes = await server.fetch(`/api/lookup/ip/${targetIp}`);
    assert.strictEqual(ipRes.status, 200);
    const ipData = await ipRes.json();
    assert.strictEqual(ipData.type, 'ip');
  });

  it('Step 4: Threat Escalation to Watchlist Monitoring', async () => {
    // Analyst decides to monitor the suspicious domain and IP in their watchlist
    const domainToAdd = `c2-malware-feed-${Date.now()}.org`;
    const ipToAdd = '198.51.100.99';

    // Add Domain
    const addDomainRes = await server.fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        itemValue: domainToAdd,
        itemType: 'domain'
      })
    });
    assert.strictEqual(addDomainRes.status, 201);
    const domainItem = await addDomainRes.json();

    // Add IP
    const addIpRes = await server.fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        itemValue: ipToAdd,
        itemType: 'ip'
      })
    });
    assert.strictEqual(addIpRes.status, 201);
    const ipItem = await addIpRes.json();

    // Retrieve active watchlist
    const listRes = await server.fetch('/api/watchlist', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(list.length >= 2);
    assert.ok(list.some((item: any) => item.id === domainItem.id));
    assert.ok(list.some((item: any) => item.id === ipItem.id));

    // De-escalate / delete one item after threat mitigation
    const deleteRes = await server.fetch(`/api/watchlist/${domainItem.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);

    // Verify deletion reflected in watchlist
    const verifyListRes = await server.fetch('/api/watchlist', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    const updatedList = await verifyListRes.json();
    assert.strictEqual(updatedList.some((item: any) => item.id === domainItem.id), false);
    assert.strictEqual(updatedList.some((item: any) => item.id === ipItem.id), true);
  });

  it('Step 5: Session Renewal and Token Refresh', async () => {
    const refreshRes = await server.fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      }
    });

    assert.strictEqual(refreshRes.status, 200);
    const refreshData = await refreshRes.json();
    assert.ok(refreshData.token);
    assert.notStrictEqual(refreshData.token, '');
    assert.strictEqual(refreshData.user.email, analystEmail);
  });
});
