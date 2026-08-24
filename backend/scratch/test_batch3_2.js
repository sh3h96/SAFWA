const { sequelize, User, Vehicle, Appointment, TechnicalReport, Invoice } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const vehicleController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/vehicleController');
const customerController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/customerController');
const dashboardController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/dashboardController');

async function runTests() {
  console.log('=== BATCH 3.2 REAL DATABASE INTEGRATION TEST ===');
  
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
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    // Clean up any stale test vehicles from previous runs
    await Vehicle.destroy({ where: { license_plate: 'UPDATED-1' } });

    // 1. Test getAllVehicles
    const reqAdmin = { user: { id: 1, role: 'admin' } };
    const resAllVehicles = createMockRes();
    await vehicleController.getAllVehicles(reqAdmin, resAllVehicles);
    if (resAllVehicles.statusCode !== 200) {
      throw new Error(`getAllVehicles failed with status ${resAllVehicles.statusCode}`);
    }
    console.log('✔ vehicleController.getAllVehicles: SUCCESS');
    console.log('   Total vehicles count:', resAllVehicles.responseData.length);

    // 2. Test getMyVehicles
    const seededClient = await User.findOne({ where: { role: 'client' } });
    if (!seededClient) throw new Error('No client found!');
    
    const reqClient = { user: { id: seededClient.id, role: 'client' } };
    const resMyVehicles = createMockRes();
    await vehicleController.getMyVehicles(reqClient, resMyVehicles);
    console.log(`✔ vehicleController.getMyVehicles (Client ID ${seededClient.id}): SUCCESS`);
    console.log('   My vehicles count:', resMyVehicles.responseData.length);

    // 3. Test getVehicleHistory for an existing vehicle
    let targetVehicle = await Vehicle.findOne({ where: { client_id: seededClient.id } });
    if (!targetVehicle) {
      targetVehicle = await Vehicle.findOne();
    }

    if (targetVehicle) {
      const reqHistory = { params: { id: targetVehicle.id }, user: { id: seededClient.id, role: 'client' } };
      const resHistory = createMockRes();
      await vehicleController.getVehicleHistory(reqHistory, resHistory);
      if (resHistory.statusCode !== 200) {
        throw new Error(`getVehicleHistory failed with status ${resHistory.statusCode}`);
      }
      console.log(`✔ vehicleController.getVehicleHistory (Vehicle ID ${targetVehicle.id}): SUCCESS`);
      console.log('   History records count:', resHistory.responseData.length);
    }

    // 4. Test getVehicleHistory for non-existent Vehicle ID (e.g. 999999)
    const reqNonExistent = { params: { id: 999999 }, user: { id: seededClient.id, role: 'client' } };
    const resNonExistent = createMockRes();
    await vehicleController.getVehicleHistory(reqNonExistent, resNonExistent);
    if (resNonExistent.statusCode !== 404) {
      throw new Error(`Expected 404 for non-existent vehicle, got ${resNonExistent.statusCode}`);
    }
    console.log('✔ vehicleController.getVehicleHistory (Non-existent ID 999999): Returned HTTP 404 SUCCESS');

    // 5. Test createVehicle & updateVehicle with Ownership
    const ts = Date.now();
    const reqCreate = {
      user: { id: seededClient.id, role: 'client' },
      body: {
        make: 'Ford',
        model: 'Taurus',
        year: 2023,
        license_plate: `TEST-${ts % 10000}`,
        vin: `VIN-${ts}`
      }
    };
    const resCreate = createMockRes();
    await vehicleController.createVehicle(reqCreate, resCreate);
    if (resCreate.statusCode !== 201 || !resCreate.responseData) {
      throw new Error(`createVehicle failed with status ${resCreate.statusCode}`);
    }
    const createdVehId = resCreate.responseData.id;
    console.log(`✔ vehicleController.createVehicle: SUCCESS (Created Vehicle ID ${createdVehId})`);

    // Test updateVehicle with Owner
    const reqUpdateOwner = {
      params: { id: createdVehId },
      user: { id: seededClient.id, role: 'client' },
      body: { make: 'Ford', model: 'Taurus Titanium', year: 2024, license_plate: `UPD-${ts % 10000}` }
    };
    const resUpdateOwner = createMockRes();
    await vehicleController.updateVehicle(reqUpdateOwner, resUpdateOwner);
    if (resUpdateOwner.statusCode !== 200) {
      throw new Error(`updateVehicle by owner failed with status ${resUpdateOwner.statusCode}`);
    }
    console.log('✔ vehicleController.updateVehicle (Owner): SUCCESS');

    // Test updateVehicle with Unauthorized Client User
    const reqUpdateUnauth = {
      params: { id: createdVehId },
      user: { id: 999999, role: 'client' },
      body: { make: 'Hacked' }
    };
    const resUpdateUnauth = createMockRes();
    await vehicleController.updateVehicle(reqUpdateUnauth, resUpdateUnauth);
    if (resUpdateUnauth.statusCode !== 404) {
      throw new Error(`Expected 404/Unauthorized for non-owner update, got ${resUpdateUnauth.statusCode}`);
    }
    console.log('✔ vehicleController.updateVehicle (Unauthorized Client): Returned HTTP 404 SUCCESS');

    // Clean up created vehicle
    await Vehicle.destroy({ where: { id: createdVehId } });

    // 6. REGRESSION TEST: Batch 3.1 Endpoints
    const resDash = createMockRes();
    await customerController.getDashboard(reqClient, resDash);
    if (resDash.statusCode !== 200) throw new Error('Batch 3.1 regression in getDashboard');

    const resMetrics = createMockRes();
    await dashboardController.getMetrics(reqAdmin, resMetrics);
    if (resMetrics.statusCode !== 200) throw new Error('Batch 3.1 regression in getMetrics');

    console.log('✔ Batch 3.1 Regression Test: ALL PASSED');

    console.log('\n=== ALL BATCH 3.2 TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n✖ TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
