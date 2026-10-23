// Applies supabase/migrations/*.sql on PGlite (in-memory Postgres) with stubbed Supabase
// auth/storage schemas, then checks RLS, RPCs and triggers as different users.
// Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] ?? fileURLToPath(new URL('../supabase/migrations', import.meta.url));
const db = new PGlite();

const STUBS = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
CREATE TABLE auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('aal', coalesce(nullif(current_setting('request.jwt.claim.aal', true), ''), 'aal1')) $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
CREATE TABLE storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
`;

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

async function as(uid, sql, params = [], aal = 'aal1') {
  return db.transaction(async (tx) => {
    await tx.exec('SET LOCAL ROLE authenticated');
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await tx.query(`SELECT set_config('request.jwt.claim.aal', $1, true)`, [aal]);
    return tx.query(sql, params);
  });
}
async function fails(uid, sql, params = []) {
  try { await as(uid, sql, params); return null; } catch (e) { return e.message; }
}

await db.exec(STUBS);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(join(dir, f), 'utf8')); console.log(`applied ${f}`); }
  catch (e) { console.log(`FAIL  migration ${f}: ${e.message}`); process.exit(1); }
}
await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
               GRANT ALL ON storage.objects TO authenticated;`);

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
await db.exec(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('${A}', 'alice@a.fr', '{"full_name":"Alice"}'),
  ('${B}', 'bob@b.fr', '{"full_name":"Bob"}'),
  ('${C}', 'carl@a.fr', '{"full_name":"Carl"}')`);

const prof = await db.query(`SELECT id, user_id, full_name, role FROM profiles ORDER BY full_name`);
ok(prof.rows.length === 3 && prof.rows.every((r) => r.user_id === r.id), 'signup trigger creates profiles with user_id');

// Profiles readable without recursion
const own = await as(A, `SELECT * FROM profiles`);
ok(own.rows.length === 1, 'user without org only sees own profile (no RLS recursion)');

// Privilege escalation blocked
ok(!!(await fails(A, `UPDATE profiles SET role = 'admin' WHERE id = '${A}'`)), 'user cannot self-promote to admin');
ok(!(await fails(A, `UPDATE profiles SET full_name = 'Alice D.' WHERE id = '${A}'`)), 'user can edit own name');

// Organizations via RPC
const orgA = (await as(A, `SELECT * FROM create_organization('Acme', 'Finance', 'fr')`)).rows[0];
ok(orgA && orgA.country === 'FR', 'create_organization returns org');
const roleA = (await as(A, `SELECT role, organization_id FROM profiles WHERE id = '${A}'`)).rows[0];
ok(roleA.role === 'admin' && roleA.organization_id === orgA.id, 'creator becomes admin of the org');
ok((await as(A, `SELECT * FROM organizations`)).rows.length === 1, 'admin sees own org');
ok((await as(A, `SELECT * FROM org_frameworks`)).rows.length === 4, 'default frameworks created');
ok(!!(await fails(A, `SELECT create_organization('Again', 'x', 'FR')`)), 'cannot create second org');
ok(!!(await fails(B, `INSERT INTO organizations (name) VALUES ('rogue')`)), 'direct org insert blocked');

const orgB = (await as(B, `SELECT * FROM create_organization('Beta', 'Santé', 'OTHER')`)).rows[0];
ok(orgB && orgB.country === null, 'country OTHER stored as NULL');
await as(C, `SELECT join_organization('${orgA.id}')`);
ok((await as(C, `SELECT role FROM profiles WHERE id = '${C}'`)).rows[0].role === 'analyst', 'joiner is analyst');
ok((await as(A, `SELECT * FROM list_org_members()`)).rows.length === 2, 'list_org_members returns org members with email');

// Business tables + refs + isolation
await as(A, `INSERT INTO risks (title, likelihood, impact) VALUES ('Ransomware', 4, 5)`);
await as(C, `INSERT INTO risks (title, likelihood, impact, residual_score) VALUES ('Phishing', 2, 3, 4)`);
const risks = (await as(A, `SELECT ref, severity, inherent_score FROM risks ORDER BY ref`)).rows;
ok(risks.length === 2 && risks[0].ref === 'R-001' && risks[1].ref === 'R-002', 'refs R-001/R-002 generated');
ok(risks[0].severity === 'critical' && risks[0].inherent_score === 20, 'severity & inherent score generated');
await as(B, `INSERT INTO risks (title) VALUES ('Other org risk')`);
ok((await as(B, `SELECT ref FROM risks`)).rows[0].ref === 'R-001', 'refs are per organization');
ok((await as(B, `SELECT * FROM risks`)).rows.length === 1, 'org B cannot see org A risks');
ok(!!(await fails(B, `INSERT INTO risks (organization_id, title) VALUES ('${orgA.id}', 'spoof')`)), 'cannot insert into another org');
ok(!(await fails(C, `DELETE FROM risks WHERE ref = 'R-001'`)) &&
   (await as(A, `SELECT * FROM risks`)).rows.length === 2, 'analyst delete is silently filtered (manager+ only)');

for (const [t, cols] of [
  ['controls', `(title) VALUES ('MFA')`], ['incidents', `(title) VALUES ('VPN')`],
  ['evidences', `(title) VALUES ('Policy pdf')`], ['policy_documents', `(title) VALUES ('ISP')`],
  ['assets', `(name) VALUES ('AD')`], ['third_parties', `(name) VALUES ('Azure')`],
  ['projects', `(title) VALUES ('PAM')`], ['clients', `(name) VALUES ('Client 1')`],
  ['action_plans', `(title, priority) VALUES ('Deploy PAM', 'high')`],
  ['compliance_requirements', `(framework, ref, title) VALUES ('NIS2', 'Art.21', 'Risk policies')`],
]) {
  const err = await fails(A, `INSERT INTO ${t} ${cols}`);
  ok(!err, `insert into ${t}${err ? ': ' + err : ''}`);
}
ok((await as(A, `SELECT ref, status FROM action_plans`)).rows[0].ref === 'AP-001', 'action plan ref + default status todo');

// Policy approval needs manager+
await as(C, `INSERT INTO policy_documents (title) VALUES ('AUP')`);
ok(!!(await fails(C, `UPDATE policy_documents SET status = 'approved' WHERE title = 'AUP'`)), 'analyst cannot approve policy');
ok(!(await fails(A, `UPDATE policy_documents SET status = 'approved' WHERE title = 'AUP'`)), 'admin can approve policy');

// Role management
ok(!!(await fails(C, `SELECT set_member_role('${C}', 'admin')`)), 'analyst cannot change roles');
ok(!(await fails(A, `SELECT set_member_role('${C}', 'manager')`)), 'admin promotes member');
ok((await as(C, `SELECT role FROM profiles WHERE id = '${C}'`)).rows[0].role === 'manager', 'role updated');
ok(!!(await fails(A, `SELECT set_member_role('${A}', 'analyst')`)), 'last admin cannot demote self');
ok(!!(await fails(A, `SELECT set_member_role('${B}', 'analyst')`)), 'cannot manage other org members');

// Audit trail
const logs = (await as(A, `SELECT action, resource_type FROM audit_logs WHERE resource_type = 'risks'`)).rows;
ok(logs.length >= 2, `audit log captured risk changes (${logs.length})`);
ok((await as(B, `SELECT * FROM audit_logs WHERE organization_id = '${orgA.id}'`)).rows.length === 0, 'audit logs isolated');

// Storage
ok(!(await fails(A, `INSERT INTO storage.objects (bucket_id, name) VALUES ('evidence', '${orgA.id}/x.pdf')`)), 'upload into own org folder');
ok(!!(await fails(B, `INSERT INTO storage.objects (bucket_id, name) VALUES ('evidence', '${orgA.id}/y.pdf')`)), 'upload into other org folder blocked');

// Existing legacy flow still works
const asmt = (await as(A, `INSERT INTO assessments (organization_id, name, created_by, status) VALUES ('${orgA.id}', 'Q4', '${A}', 'draft') RETURNING id`)).rows[0];
ok(!(await fails(A, `INSERT INTO assessment_responses (assessment_id, process_id, pillar_id, maturity_level, answered_by)
  VALUES ('${asmt.id}', 'P1.G.001', 'P1', 3, '${A}') ON CONFLICT (assessment_id, process_id) DO UPDATE SET maturity_level = 4`)), 'assessment response upsert');
ok(!(await fails(A, `INSERT INTO assessment_scores (assessment_id, global_score, cgs_tier, cmi_index) VALUES ('${asmt.id}', 3.1, 'BBB', 53)`)), 'assessment score insert');

// Regulatory content
ok((await as(A, `SELECT * FROM regulatory_alerts`)).rows.length === 7, 'regulatory alerts seeded');


// MFA enforcement: once a verified factor exists, AAL1 sessions see nothing
await db.exec(`INSERT INTO auth.mfa_factors (user_id, status) VALUES ('${C}', 'verified')`);
ok((await as(C, 'SELECT * FROM risks')).rows.length === 0, 'MFA user with AAL1 session sees no risks');
ok(!!(await fails(C, `INSERT INTO risks (title) VALUES ('x')`)), 'MFA user with AAL1 session cannot write');
ok((await as(C, 'SELECT * FROM profiles')).rows.length === 1, 'MFA user with AAL1 session still reads own profile only');
ok((await as(C, 'SELECT * FROM risks', [], 'aal2')).rows.length >= 2, 'MFA user with AAL2 session sees org risks');
ok((await as(A, 'SELECT * FROM risks')).rows.length >= 2, 'user without MFA unaffected');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL TESTS PASSED');
process.exit(failures ? 1 : 0);
