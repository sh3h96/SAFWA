const { Vehicle, VehiclePlateHistory, Op } = require('../models');

/**
 * Normalizes VIN strings (Uppercase, 17 characters, no dashes/spaces, no I, O, Q)
 */
function normalizeVin(vin, strict = false) {
  if (!vin) return null;
  const cleaned = String(vin).trim().toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length === 0) return null;
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(cleaned)) {
    if (strict) {
      const err = new Error('رقم الهيكل (VIN) غير صالح. يجب أن يتكون من 17 حرفاً ورقماً بالمعايير القياسية (بدون الأحرف I, O, Q).');
      err.statusCode = 400;
      throw err;
    }
    return null;
  }
  return cleaned;
}

/**
 * Normalizes License Plate strings
 */
function normalizePlate(plate) {
  if (!plate) return '';
  return String(plate).trim().toUpperCase();
}

/**
 * Finds candidate vehicle matches or plate conflicts based on VIN & Plate
 */
async function findPotentialVehicleMatch({ vin, license_plate, make, model, year }) {
  const normVin = vin ? normalizeVin(vin) : null;
  const normPlate = normalizePlate(license_plate);

  // 1. Match by VIN if provided
  if (normVin) {
    const vehicleByVin = await Vehicle.findOne({ where: { vin: normVin } });
    if (vehicleByVin) {
      const isSamePlate = normalizePlate(vehicleByVin.license_plate) === normPlate;
      return {
        hasMatch: true,
        matchType: isSamePlate ? 'EXACT_VIN_AND_PLATE' : 'VIN_MATCH_PLATE_UPDATE',
        vehicle: vehicleByVin,
        isPlateUpdate: !isSamePlate
      };
    }
  }

  // 2. Match by Active License Plate if provided
  if (normPlate) {
    const vehicleByPlate = await Vehicle.findOne({ where: { license_plate: normPlate } });
    if (vehicleByPlate) {
      // Check if VIN conflict exists (submitted VIN differs from vehicle's VIN)
      if (normVin && vehicleByPlate.vin && vehicleByPlate.vin !== normVin) {
        return {
          hasConflict: true,
          conflictType: 'DIFFERENT_VIN_SAME_PLATE',
          message: 'اللوحة مسجلة على مركبة أخرى برقم هيكل مختلف.',
          candidateVehicle: vehicleByPlate
        };
      }

      return {
        hasMatch: true,
        matchType: 'PLATE_CANDIDATE_MATCH',
        vehicle: vehicleByPlate,
        isPlateUpdate: false
      };
    }
  }

  return { hasMatch: false, hasConflict: false };
}

/**
 * Safely updates a vehicle's license plate while preserving full timeline in vehicle_plate_history
 */
async function updateVehiclePlateTimeline({ vehicleId, newPlate, reason = 'PLATE_UPDATE', transaction = null }) {
  const normPlate = normalizePlate(newPlate);
  if (!normPlate) return;

  const currentVehicle = await Vehicle.findByPk(vehicleId, { transaction });
  if (!currentVehicle) return;

  const oldPlate = normalizePlate(currentVehicle.license_plate);
  if (oldPlate === normPlate) return;

  // Deactivate active plate history records for this vehicle
  await VehiclePlateHistory.update(
    { is_active: false, end_date: new Date() },
    { where: { vehicle_id: vehicleId, is_active: true }, transaction }
  );

  // Create new active plate history record
  await VehiclePlateHistory.create(
    {
      vehicle_id: vehicleId,
      license_plate: normPlate,
      start_date: new Date(),
      is_active: true,
      change_reason: reason
    },
    { transaction }
  );

  // Update vehicle record current license plate
  await currentVehicle.update({ license_plate: normPlate }, { transaction });
}

module.exports = {
  normalizeVin,
  normalizePlate,
  findPotentialVehicleMatch,
  updateVehiclePlateTimeline
};
