// Test Supabase Database Connection
// Run with: node test-db-connection.js

const { Pool } = require('pg');

// Your Supabase connection string (Pooler mode)
const DATABASE_URL = 'postgresql://postgres.aaepdorqqabhscowpidz:Transport%40IT%40121@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

console.log('🔌 Testing Supabase Database Connection...\n');

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

// Test 1: Basic connection
async function testConnection() {
  try {
    console.log('Test 1: Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

// Test 2: Check tables
async function testTables() {
  try {
    console.log('Test 2: Checking tables...');
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('✅ Tables found:', result.rows.length);
    result.rows.forEach(row => {
      console.log('   -', row.tablename);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list tables:', error.message);
  }
}

// Test 3: Check indexes
async function testIndexes() {
  try {
    console.log('Test 3: Checking indexes...');
    const result = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log('✅ Indexes found:', result.rows.length);
    const tables = {};
    result.rows.forEach(row => {
      if (!tables[row.tablename]) {
        tables[row.tablename] = [];
      }
      tables[row.tablename].push(row.indexname);
    });
    
    Object.keys(tables).forEach(table => {
      console.log(`   ${table}:`, tables[table].length, 'indexes');
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list indexes:', error.message);
  }
}

// Test 4: Check functions
async function testFunctions() {
  try {
    console.log('Test 4: Checking helper functions...');
    const result = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);
    
    console.log('✅ Functions found:', result.rows.length);
    result.rows.forEach(row => {
      console.log('   -', row.routine_name);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list functions:', error.message);
  }
}

// Test 5: Check views
async function testViews() {
  try {
    console.log('Test 5: Checking views...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('✅ Views found:', result.rows.length);
    result.rows.forEach(row => {
      console.log('   -', row.table_name);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list views:', error.message);
  }
}

// Test 6: Test helper function
async function testHelperFunction() {
  try {
    console.log('Test 6: Testing helper function...');
    const result = await pool.query(`
      SELECT get_active_sessions_count('00000000-0000-0000-0000-000000000000'::uuid) as count
    `);
    console.log('✅ Helper function works!');
    console.log('   Active sessions count:', result.rows[0].count);
    console.log('');
  } catch (error) {
    console.error('❌ Helper function test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testConnection();
  await testTables();
  await testIndexes();
  await testFunctions();
  await testViews();
  await testHelperFunction();
  
  console.log('🎉 All tests completed!');
  console.log('\n💡 Database is ready to use!');
  
  // Close connection pool
  await pool.end();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});

