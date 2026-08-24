const { sequelize, User, Vehicle, Appointment, TechnicalReport, Invoice } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const customerController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/customerController');
const dashboardController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/dashboardController');

async function runTests() {
  console.log('=== BATCH 3.1 REAL DATABASE INTEGRATION TEST ===');
  
  // Helper to create mock response object
  function createMockRes() {
    return {
      statusCode: 200,
      responseData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };
  }

  try {
    // 1. Check DB connection
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    // 2. Find a seeded client user
    const seededClient = await User.findOne({ where: { role: 'client' } });
    if (!seededClient) {
      throw new Error('No client user found in database! Make sure seeders are run.');
    }
    console.log(`Testing with seeded client ID ${seededClient.id} (${seededClient.name})`);

    // 3. Test customerController.getDashboard for existing client
    const reqSeededClient = { user: { id: seededClient.id, role: 'client' } };
    const res1 = createMockRes();
    await customerController.getDashboard(reqSeededClient, res1);
    
    if (res1.statusCode !== 200 || !res1.responseData) {
      throw new Error(`getDashboard failed with status ${res1.statusCode}: ${JSON.stringify(res1.responseData)}`);
    }
    console.log('✔ customerController.getDashboard (Seeded Client): SUCCESS');
    console.log('   Vehicles count:', res1.responseData.vehicles.length);
    console.log('   Active repair:', res1.responseData.activeRepair ? res1.responseData.activeRepair.repairNumber : 'None');
    console.log('   Recent Invoices count:', res1.responseData.recentInvoices.length);

    // 4. Test customerController.getDashboard for a non-existent/empty user (e.g. ID 999999)
    const reqEmptyClient = { user: { id: 999999, role: 'client' } };
    const res2 = createMockRes();
    await customerController.getDashboard(reqEmptyClient, res2);
    console.log(`✔ customerController.getDashboard (Non-existent Client ID 999999): Returned HTTP ${res2.statusCode}`);
    
    // Create a temporary user with 0 vehicles to test empty dashboard logic
    const tempUser = await User.create({
      name: 'Test Empty User',
      email: `test_empty_${Date.now()}@test.com`,
      phone: `059${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'password123',
      role: 'client'
    });
    const reqTempClient = { user: { id: tempUser.id, role: 'client' } };
    const resTemp = createMockRes();
    await customerController.getDashboard(reqTempClient, resTemp);
    console.log('✔ customerController.getDashboard (Empty Client 0 vehicles): SUCCESS');
    console.log('   Vehicles count:', resTemp.responseData.vehicles.length);
    console.log('   Active repair:', resTemp.responseData.activeRepair);
    console.log('   Recent Invoices count:', resTemp.responseData.recentInvoices.length);
    
    // Clean up temp user
    await tempUser.destroy();

    // 5. Test dashboardController.getMetrics
    const reqAdmin = { user: { id: 1, role: 'admin' } };
    const resMetrics = createMockRes();
    await dashboardController.getMetrics(reqAdmin, resMetrics);
    if (resMetrics.statusCode !== 200) {
      throw new Error(`getMetrics failed with status ${resMetrics.statusCode}`);
    }
    console.log('✔ dashboardController.getMetrics: SUCCESS');
    console.log('   Metrics count:', resMetrics.responseData.length);

    // 6. Test dashboardController.getCharts
    const resCharts = createMockRes();
    await dashboardController.getCharts(reqAdmin, resCharts);
    if (resCharts.statusCode !== 200) {
      throw new Error(`getCharts failed with status ${resCharts.statusCode}`);
    }
    console.log('✔ dashboardController.getCharts: SUCCESS');
    console.log('   Repair Types count:', resCharts.responseData.repairTypes.types.length);

    // 7. Test dashboardController.getWorkOrders
    const resWorkOrders = createMockRes();
    await dashboardController.getWorkOrders(reqAdmin, resWorkOrders);
    if (resWorkOrders.statusCode !== 200) {
      throw new Error(`getWorkOrders failed with status ${resWorkOrders.statusCode}`);
    }
    console.log('✔ dashboardController.getWorkOrders: SUCCESS');
    console.log('   Work Orders count:', resWorkOrders.responseData.length);

    console.log('\n=== ALL BATCH 3.1 TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n✖ TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
