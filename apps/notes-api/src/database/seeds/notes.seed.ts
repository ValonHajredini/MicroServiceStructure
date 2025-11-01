import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { typeOrmConfig } from '../typeorm.config';
import { Folder } from '../../folders/entities/folder.entity';
import { Note } from '../../notes/entities/note.entity';
import { Attachment } from '../../notes/entities/attachment.entity';

// Load environment variables
config();

/**
 * Seed script for Notes database
 * Creates sample folders and notes for local development and testing
 *
 * Usage: npm run seed
 */
async function seed() {
  // CRITICAL: Prevent seed script from running in production
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    console.error('❌ FATAL ERROR: Seed script cannot run in production environment!');
    console.error('   This would TRUNCATE production data and cause data loss.');
    console.error('   If you need to seed production data, create a separate migration script.');
    process.exit(1);
  }

  console.log('🌱 Starting Notes database seeding...');
  console.log(`   Environment: ${nodeEnv}`);

  // Initialize data source
  const dataSource = new DataSource(typeOrmConfig);
  await dataSource.initialize();
  console.log('✅ Database connection established');

  try {
    // Test tenant and user IDs (replace with actual IDs from your Core Service)
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';

    const folderRepo = dataSource.getRepository(Folder);
    const noteRepo = dataSource.getRepository(Note);
    const attachmentRepo = dataSource.getRepository(Attachment);

    // Clear existing data (for development only!)
    // Must delete in order: attachments -> notes -> folders (due to FK constraints)
    console.log('🗑️  Clearing existing data...');
    await dataSource.query('TRUNCATE TABLE attachments, notes, folders CASCADE');

    // Create folders
    console.log('📁 Creating folders...');
    const personalFolder = folderRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      name: 'Personal',
    });
    await folderRepo.save(personalFolder);

    const workFolder = folderRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      name: 'Work',
    });
    await folderRepo.save(workFolder);

    console.log(`✅ Created folders: Personal (${personalFolder.id}), Work (${workFolder.id})`);

    // Create notes
    console.log('📝 Creating notes...');

    // Note 1: Personal folder - pinned
    const note1 = noteRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Grocery Shopping List',
      content: 'Milk, Eggs, Bread, Butter, Coffee, Fruits, Vegetables',
      folder_id: personalFolder.id,
      is_pinned: true,
    });
    await noteRepo.save(note1);

    // Note 2: Personal folder
    const note2 = noteRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Book Recommendations',
      content: '1. The Pragmatic Programmer\n2. Clean Code\n3. Design Patterns\n4. Refactoring',
      folder_id: personalFolder.id,
      is_pinned: false,
    });
    await noteRepo.save(note2);

    // Note 3: Work folder
    const note3 = noteRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Project Meeting Notes',
      content: 'Discussed: API design, Database schema, Deployment strategy. Next steps: Review PRD, Create tickets, Schedule sprint planning.',
      folder_id: workFolder.id,
      is_pinned: false,
    });
    await noteRepo.save(note3);

    // Note 4: Work folder
    const note4 = noteRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Code Review Checklist',
      content: '- Tests pass\n- Code follows style guide\n- No security vulnerabilities\n- Documentation updated\n- Performance optimized',
      folder_id: workFolder.id,
      is_pinned: false,
    });
    await noteRepo.save(note4);

    // Note 5: Root level (no folder)
    const note5 = noteRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      title: 'Random Thoughts',
      content: 'This is a note at the root level without any folder. It contains random ideas and thoughts.',
      folder_id: null,
      is_pinned: false,
    });
    await noteRepo.save(note5);

    console.log('✅ Created 5 sample notes');
    console.log('   - 2 notes in Personal folder (1 pinned)');
    console.log('   - 2 notes in Work folder');
    console.log('   - 1 note at root level');

    console.log('\n🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

// Run seed script
seed()
  .then(() => {
    console.log('\n✨ Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
