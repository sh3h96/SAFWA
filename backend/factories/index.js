const { faker } = require('@faker-js/faker');

// A pre-hashed password for 'password123' so we don't slow down seeding with bcrypt
const defaultPasswordHash = '$2b$10$4IitGBlTUeVQD39z3LVlFuqUzfQ/knLbevrijkORTxcoZzqHUZ042'; // password123

const createFakeUser = (role = 'client') => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  password: defaultPasswordHash,
  phone: faker.phone.number(),
  role: role,
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeVehicle = (clientId) => ({
  client_id: clientId,
  make: faker.vehicle.manufacturer(),
  model: faker.vehicle.model(),
  license_plate: faker.vehicle.vrm(),
  year: faker.number.int({ min: 2015, max: 2025 }),
  vin: faker.vehicle.vin(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeSparePart = () => ({
  name: faker.commerce.productName(),
  part_number: faker.string.alphanumeric(10).toUpperCase(),
  price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  stock_quantity: faker.number.int({ min: 0, max: 100 }),
  min_stock_level: faker.number.int({ min: 2, max: 10 }),
  brand: faker.company.name(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeAppointment = (clientId, vehicleId, mechanicId) => ({
  client_id: clientId,
  vehicle_id: vehicleId,
  mechanic_id: mechanicId,
  problem_description: faker.lorem.sentence(),
  status: faker.helpers.arrayElement([
    'pending',
    'awaiting_assignment',
    'under_inspection',
    'in_progress',
    'waiting_parts',
    'completed',
    'cancelled'
  ]),
  scheduled_date: faker.date.future(),
  created_at: new Date(),
  updated_at: new Date(),
});

const createFakeTechnicalReport = (appointmentId, mechanicId) => ({
  appointment_id: appointmentId,
  mechanic_id: mechanicId,
  diagnostics: faker.lorem.paragraph(),
  mechanic_notes: faker.lorem.sentences(2),
  odometer: faker.number.int({ min: 10000, max: 250000 }),
  obd2_codes: faker.helpers.arrayElement(['P0300', 'P0420', 'P0171', 'P0301', null]),
  visual_notes: faker.lorem.sentence(),
  repair_plan: faker.lorem.paragraph(),
  urgency_level: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
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

const createFakePayment = (invoice, amount) => ({
  invoice_id: invoice.id,
  amount: amount !== undefined ? amount : invoice.total_amount,
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
