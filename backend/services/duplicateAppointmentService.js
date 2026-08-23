'use strict';

const { Appointment, Vehicle } = require('../models');
const { Op } = require('sequelize');

const ACTIVE_STATUSES = [
  'pending',
  'awaiting_assignment',
  'under_inspection',
  'waiting_parts',
  'in_progress',
  'ready_for_pickup'
];

/**
 * Normalizes text for intelligent matching (removes extra spaces, punctuation, lowercase).
 */
function normalizeProblemText(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Checks if a matching active appointment already exists in the system.
 * Returns the existing appointment if duplicate found, or null if no duplicate.
 */
async function findActiveDuplicateAppointment({
  clientId,
  vehicleId,
  problemDescription,
  walkInCustomerId = null,
  transaction = null
}) {
  if (!vehicleId && !walkInCustomerId) return null;

  const whereClause = {
    status: { [Op.in]: ACTIVE_STATUSES }
  };

  if (clientId) {
    whereClause.client_id = clientId;
  }

  if (vehicleId) {
    whereClause.vehicle_id = vehicleId;
  }

  // Fetch candidate active appointments for this customer & vehicle
  const activeAppointments = await Appointment.findAll({
    where: whereClause,
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] }
    ],
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    transaction
  });

  if (activeAppointments.length === 0) {
    return null;
  }

  const incomingProblemNorm = normalizeProblemText(problemDescription);

  // Check if any candidate active appointment has matching problem description
  for (const candidate of activeAppointments) {
    const candidateProblemNorm = normalizeProblemText(candidate.problem_description);

    // Exact or normalized match
    if (incomingProblemNorm === candidateProblemNorm || incomingProblemNorm.includes(candidateProblemNorm) || candidateProblemNorm.includes(incomingProblemNorm)) {
      return candidate;
    }
  }

  return null;
}

module.exports = {
  ACTIVE_STATUSES,
  normalizeProblemText,
  findActiveDuplicateAppointment
};
