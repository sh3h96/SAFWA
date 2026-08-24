const { VehicleUser, VehicleWalkInCustomer } = require('../models');

/**
 * Service for managing safe multi-customer vehicle associations with 100% database referential integrity.
 */
const customerVehicleAssociationService = {
  /**
   * Associates a registered User with a Vehicle (idempotent)
   */
  associateUser: async ({ vehicleId, userId, transaction = null }) => {
    if (!vehicleId || !userId) return null;
    const [assoc] = await VehicleUser.findOrCreate({
      where: { vehicle_id: vehicleId, user_id: userId },
      defaults: { vehicle_id: vehicleId, user_id: userId },
      transaction
    });
    return assoc;
  },

  /**
   * Associates a WalkInCustomer with a Vehicle (idempotent)
   */
  associateWalkInCustomer: async ({ vehicleId, walkInCustomerId, transaction = null }) => {
    if (!vehicleId || !walkInCustomerId) return null;
    const [assoc] = await VehicleWalkInCustomer.findOrCreate({
      where: { vehicle_id: vehicleId, walk_in_customer_id: walkInCustomerId },
      defaults: { vehicle_id: vehicleId, walk_in_customer_id: walkInCustomerId },
      transaction
    });
    return assoc;
  }
};

module.exports = customerVehicleAssociationService;
