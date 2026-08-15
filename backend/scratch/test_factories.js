const sequelize = require('../config/database');
const { User, Vehicle, SparePart, Appointment } = require('../models');
const factories = require('../factories');

async function testFactories() {
  console.log('====================================================');
  console.log('🧪 TESTING FACTORIES DB INSERTION');
  console.log('====================================================');

  await sequelize.authenticate();

  // Test 1: createFakeUser
  const fakeUserData = factories.createFakeUser('client');
  const user = await User.create(fakeUserData);
  console.log('✓ Factory User inserted into DB. ID:', user.id);
  console.log('  is_email_verified:', user.is_email_verified);
  console.log('  token_version:', user.token_version);

  // Test 2: createFakeVehicle
  const fakeVehicleData = factories.createFakeVehicle(user.id);
  const vehicle = await Vehicle.create(fakeVehicleData);
  console.log('✓ Factory Vehicle inserted into DB. ID:', vehicle.id);

  // Test 3: createFakeSparePart
  const fakePartData = factories.createFakeSparePart();
  const part = await SparePart.create(fakePartData);
  console.log('✓ Factory SparePart inserted into DB. ID:', part.id);

  // Clean up
  await vehicle.destroy();
  await part.destroy();
  await user.destroy();

  await sequelize.close();
  console.log('====================================================');
  console.log('🎉 FACTORY VERIFICATION PASSED PERFECTLY!');
  console.log('====================================================');
}

testFactories().catch(err => {
  console.error('❌ Factory Test Failed:', err);
  process.exit(1);
});
