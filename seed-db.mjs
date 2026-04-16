import sql from '/sessions/tender-eloquent-gates/node_modules/mssql/index.js';

const config = {
  server: 'ms-pricing-sql.database.windows.net',
  database: 'ms-pricing-db',
  user: 'msadmin',
  password: 'MsP2024.Zuhlke.Secure',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

async function seedDatabase() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('Connected to database');

    // ── delivery_locations ─────────────────────────────────────────────────────
    console.log('Seeding delivery_locations...');
    await pool.request()
      .query(`
        DELETE FROM delivery_locations;
        INSERT INTO delivery_locations (id, name, hourly_rate_chf)
        VALUES
          (NEWID(), 'Switzerland', 150.00),
          (NEWID(), 'Singapore / HK', 100.00),
          (NEWID(), 'United Kingdom', 88.00),
          (NEWID(), 'EU (Nearshore)', 75.00),
          (NEWID(), 'Serbia', 50.00);
      `);
    const dlCount = await pool.request().query('SELECT COUNT(*) as cnt FROM delivery_locations');
    console.log(`  Inserted ${dlCount.recordset[0].cnt} locations`);

    // ── support_levels ────────────────────────────────────────────────────────
    console.log('Seeding support_levels...');
    await pool.request()
      .query(`
        DELETE FROM support_levels;
        INSERT INTO support_levels (id, name, code, uplift_decimal)
        VALUES
          (NEWID(), 'L2 Only', 'l2', 0.00),
          (NEWID(), 'L3 Only', 'l3', 0.30),
          (NEWID(), 'L2 + L3', 'l2l3', 0.60);
      `);
    const slCount = await pool.request().query('SELECT COUNT(*) as cnt FROM support_levels');
    console.log(`  Inserted ${slCount.recordset[0].cnt} support levels`);

    // ── coverage_options ──────────────────────────────────────────────────────
    console.log('Seeding coverage_options...');
    await pool.request()
      .query(`
        DELETE FROM coverage_options;
        INSERT INTO coverage_options (id, name, code, uplift_decimal)
        VALUES
          (NEWID(), 'Business Hours (09:00–17:00, Mon–Fri)', '8x5', 0.00),
          (NEWID(), 'Extended Business Hours (06:00–20:00, Mon–Fri)', '12x5', 0.10),
          (NEWID(), '24 × 7', '24x7', 0.50);
      `);
    const coCount = await pool.request().query('SELECT COUNT(*) as cnt FROM coverage_options');
    console.log(`  Inserted ${coCount.recordset[0].cnt} coverage options`);

    // ── sla_sizes ─────────────────────────────────────────────────────────────
    console.log('Seeding sla_sizes...');
    await pool.request()
      .query(`
        DELETE FROM sla_sizes;
        INSERT INTO sla_sizes (id, name, code, uplift_decimal)
        VALUES
          (NEWID(), 'Lower', 'lower', -0.10),
          (NEWID(), 'Medium', 'medium', 0.00),
          (NEWID(), 'Higher', 'higher', 0.50);
      `);
    const ssCount = await pool.request().query('SELECT COUNT(*) as cnt FROM sla_sizes');
    console.log(`  Inserted ${ssCount.recordset[0].cnt} SLA sizes`);

    console.log('\nDatabase seeding complete!');
  } catch (err) {
    console.error('Error seeding database:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

seedDatabase();
