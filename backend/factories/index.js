const { faker } = require('@faker-js/faker');

// A pre-hashed password for 'password123' so we don't slow down seeding with bcrypt
// This is typical for seeders.
const defaultPasswordHash = '$2b$10$4IitGBlTUeVQD39z3LVlFuqUzfQ/knLbevrijkORTxcoZzqHUZ042'; // password123

const createFakeUser = (role = 'client') => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  password: defaultPasswordHash,
  phone: faker.phone.number(),
  role: role,
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeVehicle = (clientId) => ({
  client_id: clientId,
  make: faker.vehicle.manufacturer(),
  model: faker.vehicle.model(),
  license_plate: faker.vehicle.vrm(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeSparePart = () => ({
  name: faker.commerce.productName(),
  part_number: faker.string.alphanumeric(10).toUpperCase(),
  price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  stock_quantity: faker.number.int({ min: 0, max: 100 }),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeAppointment = (clientId, vehicleId, mechanicId) => ({
  client_id: clientId,
  vehicle_id: vehicleId,
  mechanic_id: mechanicId,
  problem_description: faker.lorem.sentence(),
  status: faker.helpers.arrayElement(['pending', 'in-progress', 'completed', 'cancelled']),
  scheduled_date: faker.date.future(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeTechnicalReport = (appointmentId, mechanicId) => ({
  appointment_id: appointmentId,
  mechanic_id: mechanicId,
  diagnostics: faker.lorem.paragraph(),
  mechanic_notes: faker.lorem.sentences(2),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeRequiredPart = (technicalReportId, partId) => ({
  technical_report_id: technicalReportId,
  part_id: partId,
  quantity: faker.number.int({ min: 1, max: 4 }),
  status: faker.helpers.arrayElement(['pending', 'ordered', 'installed']),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeInvoice = (appointmentId) => ({
  appointment_id: appointmentId,
  total_amount: parseFloat(faker.commerce.price({ min: 100, max: 1000 })),
  status: faker.helpers.arrayElement(['unpaid', 'paid', 'partially_paid']),
  issued_at: faker.date.recent(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeInvoiceItem = (invoiceId, partId) => ({
  invoice_id: invoiceId,
  part_id: partId,
  description: faker.commerce.productDescription(),
  quantity: faker.number.int({ min: 1, max: 3 }),
  unit_price: parseFloat(faker.commerce.price({ min: 10, max: 200 })),
  total_price: parseFloat(faker.commerce.price({ min: 10, max: 600 })),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakePayment = (invoiceId) => ({
  invoice_id: invoiceId,
  amount: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
  payment_method: faker.helpers.arrayElement(['cash', 'credit_card', 'bank_transfer']),
  transaction_id: faker.string.uuid(),
  paid_at: faker.date.recent(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeReview = (appointmentId, clientId) => ({
  appointment_id: appointmentId,
  client_id: clientId,
  rating: faker.number.int({ min: 1, max: 5 }),
  comment: faker.lorem.sentence(),
  created_at: new Date(),
  updated_at: new Date(),
});

module.exports = {
  createFakeUser,
  createFakeVehicle,
  createFakeSparePart,
  createFakeAppointment,
  createFakeTechnicalReport,
  createFakeRequiredPart,
  createFakeInvoice,
  createFakeInvoiceItem,
  createFakePayment,
  createFakeReview
};
