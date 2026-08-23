'use strict';

const { faker } = require('@faker-js/faker');

// Pre-hashed password for 'password123' to avoid slow bcrypt hashing during test/seeding
const defaultPasswordHash = '$2b$10$4IitGBlTUeVQD39z3LVlFuqUzfQ/knLbevrijkORTxcoZzqHUZ042'; // password123

const ALLOWED_ROLES = ['super_admin', 'admin', 'mechanic', 'client'];
let phoneSeq = 770000000;

const generateYemeniPhone = () => {
  phoneSeq++;
  return `77${String(phoneSeq % 10000000).padStart(7, '0')}`;
};

const createFakeUser = (role = 'client', options = {}) => {
  let targetRole = role;
  if (targetRole === 'super_admin' && !options.isCanonicalSuperAdmin) {
    targetRole = 'client';
  } else if (targetRole === 'receptionist') {
    targetRole = 'admin';
  } else if (!ALLOWED_ROLES.includes(targetRole)) {
    targetRole = 'client';
  }

  return {
    name: options.name || faker.person.fullName(),
    email: options.email || faker.internet.email(),
    password: options.password || defaultPasswordHash,
    phone: options.phone || generateYemeniPhone(),
    role: targetRole,
    status: options.status || 'active',
    is_email_verified: options.is_email_verified !== undefined ? options.is_email_verified : true,
    verification_token_hash: options.verification_token_hash || null,
    verification_token_expires_at: options.verification_token_expires_at || null,
    reset_token_hash: options.reset_token_hash || null,
    reset_token_expires_at: options.reset_token_expires_at || null,
    token_version: options.token_version !== undefined ? options.token_version : 1,
    created_at: options.created_at || new Date(),
    updated_at: options.updated_at || new Date(),
  };
};

const createFakeVehicle = (clientId, options = {}) => ({
  client_id: clientId,
  make: options.make || faker.vehicle.manufacturer(),
  model: options.model || faker.vehicle.model(),
  license_plate: options.license_plate || faker.vehicle.vrm(),
  year: options.year || faker.number.int({ min: 2015, max: 2025 }),
  vin: options.vin || faker.vehicle.vin(),
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeSparePart = (options = {}) => ({
  name: options.name || faker.commerce.productName(),
  part_number: options.part_number || faker.string.alphanumeric(10).toUpperCase(),
  price: options.price !== undefined ? options.price : parseFloat(faker.commerce.price({ min: 1000, max: 50000 })),
  stock_quantity: options.stock_quantity !== undefined ? options.stock_quantity : faker.number.int({ min: 5, max: 50 }),
  min_stock_level: options.min_stock_level !== undefined ? options.min_stock_level : faker.number.int({ min: 1, max: 5 }),
  brand: options.brand || faker.company.name(),
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

// Generic Appointment Factory
const createFakeAppointment = (clientId, vehicleId, mechanicId, options = {}) => {
  const status = options.status || 'pending';
  const appt = {
    client_id: clientId || null,
    vehicle_id: vehicleId || null,
    mechanic_id: mechanicId || null,
    problem_description: options.problem_description || faker.lorem.sentence(),
    status: status,
    scheduled_date: options.scheduled_date || faker.date.future(),
    delivered_at: options.delivered_at || (status === 'completed' ? new Date() : null),
    cancellation_reason: options.cancellation_reason || (status === 'cancelled' ? 'Client change of mind' : null),
    created_at: options.created_at || new Date(),
    updated_at: options.updated_at || new Date(),
  };
  return appt;
};

// Workflow-Specific Explicit Factories
const createPendingAppointment = (clientId, vehicleId, options = {}) => 
  createFakeAppointment(clientId, vehicleId, null, { ...options, status: 'pending' });

const createUnderInspectionAppointment = (clientId, vehicleId, mechanicId, options = {}) => 
  createFakeAppointment(clientId, vehicleId, mechanicId, { ...options, status: 'under_inspection' });

const createInProgressAppointment = (clientId, vehicleId, mechanicId, options = {}) => 
  createFakeAppointment(clientId, vehicleId, mechanicId, { ...options, status: 'in_progress' });

const createReadyForPickupAppointment = (clientId, vehicleId, mechanicId, options = {}) => 
  createFakeAppointment(clientId, vehicleId, mechanicId, { ...options, status: 'ready_for_pickup' });

const createCompletedAppointment = (clientId, vehicleId, mechanicId, options = {}) => 
  createFakeAppointment(clientId, vehicleId, mechanicId, { 
    ...options, 
    status: 'completed', 
    delivered_at: options.delivered_at || new Date() 
  });

const createCancelledAppointment = (clientId, vehicleId, reason = 'Client request', options = {}) => 
  createFakeAppointment(clientId, vehicleId, null, { 
    ...options, 
    status: 'cancelled', 
    cancellation_reason: reason 
  });

const createFakeTechnicalReport = (appointmentId, mechanicId, options = {}) => ({
  appointment_id: appointmentId,
  mechanic_id: mechanicId || null,
  diagnostics: options.diagnostics || faker.lorem.paragraph(),
  mechanic_notes: options.mechanic_notes || faker.lorem.sentences(2),
  odometer: options.odometer || faker.number.int({ min: 10000, max: 250000 }),
  obd2_codes: options.obd2_codes || faker.helpers.arrayElement(['P0300', 'P0420', 'P0171', 'P0301', null]),
  visual_notes: options.visual_notes || faker.lorem.sentence(),
  repair_plan: options.repair_plan || faker.lorem.paragraph(),
  urgency_level: options.urgency_level || faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
  estimated_labor_cost: options.estimated_labor_cost !== undefined ? options.estimated_labor_cost : 10000.0,
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeRequiredPart = (technicalReportId, partId, options = {}) => ({
  technical_report_id: technicalReportId,
  part_id: partId,
  quantity: options.quantity || faker.number.int({ min: 1, max: 4 }),
  status: options.status || 'pending',
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeNewPartRequest = (appointmentId, mechanicId, options = {}) => ({
  appointment_id: appointmentId,
  requested_by_mechanic_id: mechanicId,
  part_name: options.part_name || faker.commerce.productName(),
  part_number: options.part_number || faker.string.alphanumeric(8).toUpperCase(),
  notes: options.notes || faker.lorem.sentence(),
  status: options.status || 'pending',
  rejection_reason: options.status === 'rejected' ? (options.rejection_reason || 'Out of scope') : null,
  created_spare_part_id: options.created_spare_part_id || null,
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeInvoice = (appointmentId, options = {}) => ({
  appointment_id: appointmentId,
  total_amount: options.total_amount !== undefined ? options.total_amount : 15000.0,
  status: options.status || 'unpaid',
  issued_at: options.issued_at || new Date(),
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeInvoiceItem = (invoiceId, partId, options = {}) => {
  const qty = options.quantity || 1;
  const unitPrice = options.unit_price !== undefined ? options.unit_price : 5000.0;
  return {
    invoice_id: invoiceId,
    part_id: partId || null,
    description: options.description || faker.commerce.productDescription(),
    quantity: qty,
    unit_price: unitPrice,
    total_price: qty * unitPrice,
    created_at: options.created_at || new Date(),
    updated_at: options.updated_at || new Date(),
  };
};

const createFakePayment = (invoice, amount, options = {}) => ({
  invoice_id: invoice.id,
  amount: amount !== undefined ? amount : invoice.total_amount,
  payment_method: options.payment_method || faker.helpers.arrayElement(['cash', 'card']),
  transaction_id: options.transaction_id || `TXN-${faker.string.uuid().slice(0, 8).toUpperCase()}`,
  paid_at: options.paid_at || new Date(),
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

const createFakeReview = (appointmentId, clientId, options = {}) => ({
  appointment_id: appointmentId,
  client_id: clientId,
  rating: options.rating || faker.number.int({ min: 4, max: 5 }),
  comment: options.comment || faker.lorem.sentence(),
  created_at: options.created_at || new Date(),
  updated_at: options.updated_at || new Date(),
});

module.exports = {
  createFakeUser,
  createFakeVehicle,
  createFakeSparePart,
  createFakeAppointment,
  createPendingAppointment,
  createUnderInspectionAppointment,
  createInProgressAppointment,
  createReadyForPickupAppointment,
  createCompletedAppointment,
  createCancelledAppointment,
  createFakeTechnicalReport,
  createFakeRequiredPart,
  createFakeNewPartRequest,
  createFakeInvoice,
  createFakeInvoiceItem,
  createFakePayment,
  createFakeReview
};
