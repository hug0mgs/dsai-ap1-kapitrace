// Shared metadata inspection. Never selects user data or connection credentials.
export const INITIAL_MIGRATION = '20261006000100_initial_postgresql';
export const SECURITY_MIGRATION = '20261006000200_backend_only_security';
const text = ['text', false];
const date = ['timestamp', false];
const score = ['float8', false];
export const expectedTables = {
  User: { id: text, email: text, password: text, name: ['text', true], role: text, createdAt: date, updatedAt: date },
  AuditLog: { id: text, userId: text, action: text, details: ['text', true], createdAt: date },
  Watchlist: { id: text, userId: text, itemValue: text, itemType: text, createdAt: date },
  IpCache: { ip: text, threatScore: score, data: text, updatedAt: date },
  DomainCache: { domain: text, threatScore: score, data: text, updatedAt: date },
  HashCache: { hash: text, threatScore: score, data: text, updatedAt: date },
  EmailCache: { email: text, threatScore: score, data: text, updatedAt: date },
};
export async function inspectDatabase(client) {
  const columns = await client.$queryRaw`
    SELECT table_name, column_name, udt_name, is_nullable, datetime_precision, column_default
    FROM information_schema.columns WHERE table_schema = current_schema()`;
  const indexes = await client.$queryRaw`
    SELECT t.relname AS table_name, i.indisprimary AS primary_key, i.indisunique AS unique_key,
      ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum, position)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum ORDER BY k.position) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema() AND i.indisvalid AND i.indpred IS NULL AND i.indexprs IS NULL`;
  const foreignKeys = await client.$queryRaw`
    SELECT t.relname AS table_name, p.relname AS parent_table, pn.nspname AS parent_schema,
      f.confupdtype::text AS on_update, f.confdeltype::text AS on_delete,
      ARRAY(SELECT a.attname::text FROM unnest(f.conkey) WITH ORDINALITY k(attnum, position)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum ORDER BY k.position) AS columns,
      ARRAY(SELECT a.attname::text FROM unnest(f.confkey) WITH ORDINALITY k(attnum, position)
        JOIN pg_attribute a ON a.attrelid = p.oid AND a.attnum = k.attnum ORDER BY k.position) AS parent_columns
    FROM pg_constraint f JOIN pg_class t ON t.oid = f.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_class p ON p.oid = f.confrelid JOIN pg_namespace pn ON pn.oid = p.relnamespace
    WHERE f.contype = 'f' AND n.nspname = current_schema()`;
  const tables = await client.$queryRaw`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
      ((r.rolsuper OR r.rolbypassrls OR pg_has_role(current_user, c.relowner, 'USAGE'))
        AND has_table_privilege(current_user, c.oid, 'SELECT')
        AND has_table_privilege(current_user, c.oid, 'INSERT')
        AND has_table_privilege(current_user, c.oid, 'UPDATE')
        AND has_table_privilege(current_user, c.oid, 'DELETE')) AS backend_access
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.rolname = current_user
    WHERE n.nspname = current_schema() AND c.relkind = 'r'`;
  const [{ schema }] = await client.$queryRaw`SELECT current_schema()::text AS schema`;
  const issues = [];
  for (const [table, required] of Object.entries(expectedTables)) {
    for (const [name, [type, nullable]] of Object.entries(required)) {
      const column = columns.find(value => value.table_name === table && value.column_name === name);
      if (!column || column.udt_name !== type || (column.is_nullable === 'YES') !== nullable || type === 'timestamp' && column.datetime_precision !== 3) issues.push(`${table}.${name}: incompatible column`);
      if (column && name === 'createdAt' && !column.column_default) issues.push(`${table}.${name}: database default required`);
      if (column && table === 'User' && name === 'role' && !column.column_default?.includes("'viewer'")) issues.push('User.role: default viewer required');
    }
    const primary = table.endsWith('Cache') ? Object.keys(required)[0] : 'id';
    if (!indexes.some(index => index.table_name === table && index.primary_key && index.columns.length === 1 && index.columns[0] === primary)) issues.push(`${table}: primary key missing`);
  }
  if (!indexes.some(index => index.table_name === 'User' && index.unique_key && index.columns.length === 1 && index.columns[0] === 'email')) issues.push('User.email: unique index required');
  for (const table of ['Watchlist', 'AuditLog']) {
    if (!foreignKeys.some(key => key.table_name === table && key.parent_table === 'User' && key.parent_schema === schema && key.columns.length === 1 && key.columns[0] === 'userId' && key.parent_columns.length === 1 && key.parent_columns[0] === 'id' && key.on_update === 'c' && key.on_delete === 'r')) issues.push(`${table}.userId: compatible foreign key required`);
  }
  return { issues, tables: tables.filter(table => table.table_name in expectedTables) };
}
