import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed script to create test users for development
 *
 * Usage: ts-node src/database/seeds/seed-test-users.ts
 */

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  status: string;
}

async function seedTestUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'core_db',
  });

  await dataSource.initialize();
  console.log('Database connected');

  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const memberPassword = await bcrypt.hash('Member123!', 10);

    // Create or get Tenant 1
    let tenant1 = await dataSource.query(
      `SELECT id FROM tenants WHERE name = $1`,
      ['Tenant 1']
    );

    if (tenant1.length === 0) {
      const tenant1Id = uuidv4();
      await dataSource.query(
        `INSERT INTO tenants (id, name, status, enabled_services, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [tenant1Id, 'Tenant 1', 'active', JSON.stringify([])]
      );
      tenant1 = [{ id: tenant1Id }];
      console.log('✅ Created Tenant 1');
    } else {
      console.log('✅ Tenant 1 already exists');
    }

    // Create or get Tenant 2
    let tenant2 = await dataSource.query(
      `SELECT id FROM tenants WHERE name = $1`,
      ['Tenant 2']
    );

    if (tenant2.length === 0) {
      const tenant2Id = uuidv4();
      await dataSource.query(
        `INSERT INTO tenants (id, name, status, enabled_services, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [tenant2Id, 'Tenant 2', 'active', JSON.stringify([])]
      );
      tenant2 = [{ id: tenant2Id }];
      console.log('✅ Created Tenant 2');
    } else {
      console.log('✅ Tenant 2 already exists');
    }

    const tenant1Id = tenant1[0].id;
    const tenant2Id = tenant2[0].id;

    // User 1: admin@tenant1.com (Tenant 1 Admin)
    const existingAdmin1 = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@tenant1.com']
    );

    if (existingAdmin1.length === 0) {
      const admin1Id = uuidv4();
      await dataSource.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [admin1Id, tenant1Id, 'admin@tenant1.com', adminPassword, 'Admin', 'User', 'active']
      );

      // Assign admin role
      await dataSource.query(
        `INSERT INTO user_tenant_roles (id, user_id, tenant_id, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), admin1Id, tenant1Id, 'admin']
      );

      console.log('✅ Created admin@tenant1.com (Tenant 1 Admin)');
    } else {
      console.log('⚠️  admin@tenant1.com already exists');
    }

    // User 2: member@tenant1.com (Tenant 1 Member)
    const existingMember1 = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['member@tenant1.com']
    );

    if (existingMember1.length === 0) {
      const member1Id = uuidv4();
      await dataSource.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [member1Id, tenant1Id, 'member@tenant1.com', memberPassword, 'Member', 'User', 'active']
      );

      // Assign user role
      await dataSource.query(
        `INSERT INTO user_tenant_roles (id, user_id, tenant_id, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), member1Id, tenant1Id, 'user']
      );

      console.log('✅ Created member@tenant1.com (Tenant 1 Member)');
    } else {
      console.log('⚠️  member@tenant1.com already exists');
    }

    // User 3: admin@tenant2.com (Tenant 2 Admin)
    const existingAdmin2 = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@tenant2.com']
    );

    if (existingAdmin2.length === 0) {
      const admin2Id = uuidv4();
      await dataSource.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [admin2Id, tenant2Id, 'admin@tenant2.com', adminPassword, 'Admin', 'User', 'active']
      );

      // Assign admin role
      await dataSource.query(
        `INSERT INTO user_tenant_roles (id, user_id, tenant_id, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), admin2Id, tenant2Id, 'admin']
      );

      console.log('✅ Created admin@tenant2.com (Tenant 2 Admin)');
    } else {
      console.log('⚠️  admin@tenant2.com already exists');
    }

    console.log('\n🎉 Test users seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. admin@tenant1.com / Admin123!');
    console.log('   Role: Admin | Tenant: Tenant 1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. member@tenant1.com / Member123!');
    console.log('   Role: Member | Tenant: Tenant 1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. admin@tenant2.com / Admin123!');
    console.log('   Role: Admin | Tenant: Tenant 2');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

seedTestUsers()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
