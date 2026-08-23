'use strict';

const { WalkInCustomer, WalkInVisit, User, Sequelize } = require('../models');
const { Op } = Sequelize;

/**
 * Normalize phone number for consistent matching.
 * Converts international format (+967), leading zeroes, and strips non-digit characters.
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('967')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Normalize text/name for similarity matching.
 * Normalizes Arabic letters (alef, marboota, hamza) and trims extra spaces.
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  let normalized = name.trim().toLowerCase();
  // Arabic character normalization
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  normalized = normalized.replace(/ة/g, 'ه');
  normalized = normalized.replace(/ى/g, 'ي');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

/**
 * Search and analyze potential historical WalkInCustomer and permanent User matches based on input signals.
 * Does NOT merge records. Returns deterministic match signals.
 */
async function findPotentialMatches({ name, phone, vehicle_license_plate, vehicle_vin, transaction = null }) {
  const normPhone = normalizePhone(phone);
  const normName = normalizeName(name);

  if (!normPhone && !normName && !vehicle_license_plate && !vehicle_vin) {
    return { hasPotentialMatches: false, matches: [] };
  }

  const allMatches = [];

  // 1. Search permanent User accounts (role = 'client')
  if (normPhone) {
    const userSearchConditions = [
      { phone: { [Op.like]: `%${normPhone}%` } }
    ];
    if (normName && normName.length >= 2) {
      userSearchConditions.push({ name: { [Op.like]: `%${normName}%` } });
    }

    const userCandidates = await User.findAll({
      where: {
        [Op.or]: userSearchConditions
      },
      attributes: ['id', 'name', 'phone', 'email', 'role'],
      transaction
    });

    userCandidates.forEach(u => {
      const uNormPhone = normalizePhone(u.phone);
      const uNormName = normalizeName(u.name);
      const isPhoneMatch = normPhone && uNormPhone === normPhone;
      const isNameMatch = normName && (uNormName === normName || uNormName.includes(normName));

      const matchReasons = ['permanent_user_account'];
      if (isPhoneMatch) matchReasons.push('same_phone');
      if (isNameMatch) matchReasons.push('same_name');

      allMatches.push({
        customerId: u.id,
        isPermanentUser: true,
        userId: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        matchType: isPhoneMatch ? 'permanent_user_phone' : 'permanent_user_name',
        matchReasons,
        requiresConfirmation: true,
        visitCount: 0
      });
    });
  }

  // 2. Search WalkInCustomer records
  const searchConditions = [];

  if (normPhone) {
    searchConditions.push({
      phone: { [Op.like]: `%${normPhone}%` }
    });
  }

  if (normName && normName.length >= 2) {
    searchConditions.push({
      name: { [Op.like]: `%${normName}%` }
    });
  }

  let visitCustomerIds = [];
  if (vehicle_license_plate || vehicle_vin) {
    const visitConditions = [];
    if (vehicle_license_plate) {
      visitConditions.push({ vehicle_license_plate: vehicle_license_plate.trim() });
    }
    if (vehicle_vin) {
      visitConditions.push({ vehicle_vin: vehicle_vin.trim() });
    }

    const matchingVisits = await WalkInVisit.findAll({
      where: { [Op.or]: visitConditions },
      attributes: ['walk_in_customer_id'],
      transaction
    });

    visitCustomerIds = matchingVisits.map(v => v.walk_in_customer_id);
    if (visitCustomerIds.length > 0) {
      searchConditions.push({ id: { [Op.in]: visitCustomerIds } });
    }
  }

  if (searchConditions.length > 0) {
    const options = {
      where: { [Op.or]: searchConditions },
      include: [{ model: WalkInVisit, as: 'visits' }],
      transaction
    };

    const candidates = await WalkInCustomer.findAll(options);

    if (candidates && candidates.length > 0) {
      candidates.forEach(candidate => {
        const candNormPhone = normalizePhone(candidate.phone);
        const candNormName = normalizeName(candidate.name);

        const matchReasons = [];
        let isPhoneMatch = false;
        let isNameMatch = false;

        if (normPhone && candNormPhone === normPhone) {
          isPhoneMatch = true;
          matchReasons.push('same_phone');
        } else if (normPhone && candNormPhone && (candNormPhone.includes(normPhone) || normPhone.includes(candNormPhone))) {
          isPhoneMatch = true;
          matchReasons.push('similar_phone');
        }

        if (normName && candNormName === normName) {
          isNameMatch = true;
          matchReasons.push('same_name');
        } else if (normName && candNormName && (candNormName.includes(normName) || normName.includes(candNormName))) {
          isNameMatch = true;
          matchReasons.push('similar_name');
        }

        if (visitCustomerIds.includes(Number(candidate.id))) {
          matchReasons.push('same_vehicle');
        }

        let matchType = 'possible_match';
        if (isPhoneMatch && isNameMatch) {
          matchType = 'phone_and_name';
        } else if (isPhoneMatch && !isNameMatch) {
          matchType = 'same_phone_different_name';
          matchReasons.push('warning_different_name');
        } else if (!isPhoneMatch && isNameMatch) {
          matchType = 'same_name_different_phone';
          matchReasons.push('suggestion_different_phone');
        }

        allMatches.push({
          customerId: candidate.id,
          isPermanentUser: false,
          name: candidate.name,
          phone: candidate.phone,
          notes: candidate.notes,
          matchType,
          matchReasons,
          requiresConfirmation: true,
          visitCount: candidate.visits ? candidate.visits.length : 0
        });
      });
    }
  }

  return {
    hasPotentialMatches: allMatches.length > 0,
    matches: allMatches
  };
}

module.exports = {
  normalizePhone,
  normalizeName,
  findPotentialMatches
};

