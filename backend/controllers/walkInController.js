const { WalkInCustomer, WalkInVisit, Appointment, Vehicle, VehiclePlateHistory, Invoice, sequelize, Sequelize } = require('../models');
const { Op } = Sequelize;
const { logAudit } = require('../utils/auditLogger');
const { findPotentialMatches } = require('../services/walkInCustomerMatchingService');
const customerVehicleAssociationService = require('../services/customerVehicleAssociationService');
const vehicleMatchingService = require('../services/vehicleMatchingService');

module.exports = {
  // GET /api/walk-in-customers/search?q=...
  searchCustomers: async (req, res) => {
    try {
      const q = (req.query.q || req.query.query || '').trim();
      if (!q) {
        return res.json({ customers: [] });
      }

      // Search matching customer ids from visit vehicle snapshot fields
      const matchingVisits = await WalkInVisit.findAll({
        where: {
          [Op.or]: [
            { vehicle_license_plate: { [Op.like]: `%${q}%` } },
            { vehicle_vin: { [Op.like]: `%${q}%` } },
            { vehicle_make: { [Op.like]: `%${q}%` } },
            { vehicle_model: { [Op.like]: `%${q}%` } }
          ]
        },
        attributes: ['walk_in_customer_id']
      });

      const customerIdsFromVisits = matchingVisits.map(v => v.walk_in_customer_id);

      const searchConditions = [
        { name: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } }
      ];

      if (customerIdsFromVisits.length > 0) {
        searchConditions.push({ id: { [Op.in]: customerIdsFromVisits } });
      }

      const customers = await WalkInCustomer.findAll({
        where: { [Op.or]: searchConditions },
        include: [{
          model: WalkInVisit,
          as: 'visits'
        }],
        order: [['created_at', 'DESC']]
      });

      const formatted = customers.map(cust => {
        const visits = cust.visits || [];
        const lastVisit = visits.length > 0
          ? visits.reduce((latest, v) => new Date(v.created_at) > new Date(latest.created_at) ? v : latest, visits[0])
          : null;

        // Distinct vehicle snapshots
        const vehicleMap = new Map();
        visits.forEach(v => {
          const key = `${v.vehicle_make}-${v.vehicle_model}-${v.vehicle_license_plate || ''}`;
          if (!vehicleMap.has(key)) {
            vehicleMap.set(key, {
              make: v.vehicle_make,
              model: v.vehicle_model,
              year: v.vehicle_year,
              licensePlate: v.vehicle_license_plate,
              vin: v.vehicle_vin,
              color: v.vehicle_color
            });
          }
        });

        return {
          id: Number(cust.id),
          name: cust.name,
          phone: cust.phone,
          notes: cust.notes,
          createdAt: cust.created_at,
          visitCount: visits.length,
          lastVisitAt: lastVisit ? lastVisit.created_at : null,
          vehicles: Array.from(vehicleMap.values())
        };
      });

      res.json({ customers: formatted });
    } catch (error) {
      console.error('Error searching walk-in customers:', error);
      res.status(500).json({ message: 'خطأ في البحث عن العملاء الحضوريين' });
    }
  },

  // GET /api/walk-in-customers
  listCustomers: async (req, res) => {
    try {
      const customers = await WalkInCustomer.findAll({
        include: [{
          model: WalkInVisit,
          as: 'visits'
        }],
        order: [['created_at', 'DESC']]
      });

      const formatted = customers.map(cust => {
        const visits = cust.visits || [];
        const lastVisit = visits.length > 0
          ? visits.reduce((latest, v) => new Date(v.created_at) > new Date(latest.created_at) ? v : latest, visits[0])
          : null;

        return {
          id: Number(cust.id),
          name: cust.name,
          phone: cust.phone,
          notes: cust.notes,
          createdAt: cust.created_at,
          visitCount: visits.length,
          lastVisitAt: lastVisit ? lastVisit.created_at : null
        };
      });

      res.json({ customers: formatted });
    } catch (error) {
      console.error('Error listing walk-in customers:', error);
      res.status(500).json({ message: 'خطأ في جلب قائمة العملاء الحضوريين' });
    }
  },

  // GET /api/walk-in-customers/:id
  getCustomer: async (req, res) => {
    try {
      const customer = await WalkInCustomer.findByPk(req.params.id, {
        include: [{ model: WalkInVisit, as: 'visits' }]
      });

      if (!customer) {
        return res.status(404).json({ message: 'العميل الحضوري غير موجود' });
      }

      res.json(customer);
    } catch (error) {
      console.error('Error fetching walk-in customer:', error);
      res.status(500).json({ message: 'خطأ في جلب بيانات العميل' });
    }
  },

  // GET /api/walk-in-customers/:id/history
  getCustomerHistory: async (req, res) => {
    try {
      const customer = await WalkInCustomer.findByPk(req.params.id, {
        include: [{
          model: WalkInVisit,
          as: 'visits',
          include: [{
            model: Appointment,
            as: 'appointment',
            include: [{ model: Invoice, as: 'invoice' }]
          }]
        }]
      });

      if (!customer) {
        return res.status(404).json({ message: 'العميل الحضوري غير موجود' });
      }

      const visits = customer.visits || [];

      const formattedVisits = await Promise.all(visits.map(async (v) => {
        const appt = v.appointment || null;
        const inv = appt ? appt.invoice : null;
        let realVehicleId = appt && appt.vehicle_id ? Number(appt.vehicle_id) : null;

        if (!realVehicleId && (v.vehicle_make || v.vehicle_model || v.vehicle_license_plate)) {
          try {
            const vehicleMatchingService = require('../services/vehicleMatchingService');
            const normPlate = v.vehicle_license_plate ? vehicleMatchingService.normalizePlate(v.vehicle_license_plate) : null;
            const normVin = v.vehicle_vin ? vehicleMatchingService.normalizeVin(v.vehicle_vin) : null;

            let existingV = await vehicleMatchingService.findPotentialVehicleMatch({
              vin: normVin,
              license_plate: normPlate,
              make: v.vehicle_make,
              model: v.vehicle_model,
              year: v.vehicle_year
            });

            let physVehicle = existingV.hasMatch ? existingV.vehicle : null;
            if (!physVehicle) {
              const finalPlate = normPlate || `WALKIN-PLT-${Date.now()}`;
              physVehicle = await Vehicle.create({
                client_id: null,
                make: v.vehicle_make || 'غير محدد',
                model: v.vehicle_model || 'غير محدد',
                year: v.vehicle_year || null,
                license_plate: finalPlate,
                vin: normVin || null,
                color: v.vehicle_color || null,
                transmission: v.vehicle_transmission || null,
                fuel_type: v.vehicle_fuel_type || null
              });
            }

            if (physVehicle) {
              realVehicleId = Number(physVehicle.id);
              if (appt) {
                await appt.update({ vehicle_id: physVehicle.id });
              }
            }
          } catch (e) {
            console.error('Error resolving vehicle in getCustomerHistory:', e);
          }
        }

        return {
          id: Number(v.id),
          visitDate: v.created_at,
          status: v.status,
          problemDescription: v.problem_description,
          notes: v.notes,
          vehicleId: realVehicleId,
          vehicle_id: realVehicleId,
          vehicleSnapshot: {
            id: realVehicleId,
            vehicle_id: realVehicleId,
            make: v.vehicle_make,
            model: v.vehicle_model,
            year: v.vehicle_year,
            licensePlate: v.vehicle_license_plate,
            vin: v.vehicle_vin,
            color: v.vehicle_color,
            transmission: v.vehicle_transmission,
            fuelType: v.vehicle_fuel_type
          },
          vehicle_transmission: v.vehicle_transmission,
          vehicle_fuel_type: v.vehicle_fuel_type,
          appointment: appt ? {
            id: Number(appt.id),
            vehicle_id: realVehicleId,
            status: appt.status,
            scheduledDate: appt.scheduled_date,
            deliveredAt: appt.delivered_at
          } : null,
          invoice: inv ? {
            id: Number(inv.id),
            status: inv.status,
            totalAmount: parseFloat(inv.total_amount),
            issuedAt: inv.issued_at
          } : null
        };
      }));

      res.json({
        customer: {
          id: Number(customer.id),
          name: customer.name,
          phone: customer.phone,
          notes: customer.notes,
          createdAt: customer.created_at
        },
        visitsCount: formattedVisits.length,
        visits: formattedVisits
      });
    } catch (error) {
      console.error('Error fetching customer history:', error);
      res.status(500).json({ message: 'خطأ في جلب السجل التاريخي للعميل' });
    }
  },

  // PUT /api/walk-in-customers/:id
  updateCustomer: async (req, res) => {
    try {
      const customer = await WalkInCustomer.findByPk(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'العميل الحضوري غير موجود' });
      }

      const oldValues = customer.toJSON();
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name.trim();
      if (req.body.phone !== undefined) updates.phone = req.body.phone.trim();
      if (req.body.notes !== undefined) updates.notes = req.body.notes;

      await customer.update(updates);

      await logAudit({
        req,
        action: 'WALKIN_CUSTOMER_UPDATED',
        entityType: 'WalkInCustomer',
        entityId: customer.id,
        oldValues,
        newValues: customer.toJSON()
      });

      res.json({ message: 'تم تحديث بيانات العميل بنجاح', customer });
    } catch (error) {
      console.error('Error updating walk-in customer:', error);
      res.status(500).json({ message: 'خطأ في تحديث بيانات العميل' });
    }
  },

  // POST /api/walk-in-customers/match
  matchCustomer: async (req, res) => {
    try {
      const { name, phone, vehicle_license_plate, vehicle_vin } = req.body;
      const matchResult = await findPotentialMatches({ name, phone, vehicle_license_plate, vehicle_vin });
      res.json(matchResult);
    } catch (error) {
      console.error('Error matching walk-in customer:', error);
      res.status(500).json({ message: 'خطأ أثناء مطابقة بيانات العميل الحضوري' });
    }
  },

  // POST /api/walk-in-customers/resolve-match
  resolveMatch: async (req, res) => {
    const { User } = require('../models');
    const t = await sequelize.transaction();
    try {
      const { existing_customer_id, is_permanent_user, decision, customer: customerData, visit: visitData } = req.body;

      if (!decision || !['same_customer', 'different_customer'].includes(decision)) {
        await t.rollback();
        return res.status(400).json({ message: 'القرار غير صالح، يجب تحديد same_customer أو different_customer' });
      }

      if (!visitData || !visitData.vehicle_make || !visitData.vehicle_model || !visitData.problem_description) {
        await t.rollback();
        return res.status(400).json({ message: 'بيانات الزيارة (نوع السيارة، الموديل، وصف المشكلة) مطلوبة' });
      }

      let finalCustomer = null;
      let finalVisit = null;
      let finalAppt = null;

      if (decision === 'same_customer') {
        if (!existing_customer_id) {
          await t.rollback();
          return res.status(400).json({ message: 'معرف العميل الموجود مطلوب عند اختيار same_customer' });
        }

        let linkedClientId = null;
        let linkedWalkInCustId = null;

        if (is_permanent_user) {
          const userObj = await User.findByPk(existing_customer_id, { transaction: t });
          if (!userObj) {
            await t.rollback();
            return res.status(404).json({ message: 'حساب العميل الدائم المحدد غير موجود' });
          }
          linkedClientId = userObj.id;
          const [walkInCust] = await WalkInCustomer.findOrCreate({
            where: { phone: userObj.phone },
            defaults: {
              name: userObj.name,
              phone: userObj.phone,
              notes: `حساب دائم (#${userObj.id})`
            },
            transaction: t
          });
          linkedWalkInCustId = walkInCust.id;
          finalCustomer = { id: userObj.id, name: userObj.name, phone: userObj.phone, isPermanentUser: true };
        } else {
          finalCustomer = await WalkInCustomer.findByPk(existing_customer_id, { transaction: t });
          if (!finalCustomer) {
            await t.rollback();
            return res.status(404).json({ message: 'العميل التاريخي المحدد غير موجود' });
          }
          linkedWalkInCustId = finalCustomer.id;
        }

        const targetPlate = (visitData.vehicle_license_plate || visitData.license_plate || '').trim();
        const normPlate = targetPlate ? vehicleMatchingService.normalizePlate(targetPlate) : null;
        const cleanVin = visitData.vehicle_vin && String(visitData.vehicle_vin).trim() ? String(visitData.vehicle_vin).trim() : null;
        const normVin = cleanVin ? vehicleMatchingService.normalizeVin(cleanVin) : null;
        const targetTransmission = (visitData.vehicle_transmission || visitData.transmission || '').trim() || null;
        const targetFuelType = (visitData.vehicle_fuel_type || visitData.fuel_type || '').trim() || null;

        let vehicle = null;
        if (normPlate || normVin) {
          const match = await vehicleMatchingService.findPotentialVehicleMatch({
            vin: normVin,
            license_plate: normPlate,
            make: visitData.vehicle_make,
            model: visitData.vehicle_model,
            year: visitData.vehicle_year
          });

          if (match.hasMatch && match.vehicle) {
            vehicle = match.vehicle;
            if (match.isPlateUpdate && normPlate) {
              await vehicleMatchingService.updateVehiclePlateTimeline({
                vehicleId: vehicle.id,
                newPlate: normPlate,
                reason: 'PLATE_UPDATE',
                transaction: t
              });
            }
          }
        }

        if (!vehicle) {
          const finalPlate = normPlate || `WALKIN-PLT-${Date.now()}`;
          vehicle = await Vehicle.create({
            make: visitData.vehicle_make.trim(),
            model: (visitData.vehicle_model || '').trim(),
            year: visitData.vehicle_year ? parseInt(visitData.vehicle_year, 10) : null,
            license_plate: finalPlate,
            vin: normVin,
            color: visitData.vehicle_color ? visitData.vehicle_color.trim() : null,
            transmission: targetTransmission,
            fuel_type: targetFuelType,
            client_id: linkedClientId || null
          }, { transaction: t });

          await VehiclePlateHistory.create({
            vehicle_id: vehicle.id,
            license_plate: finalPlate,
            start_date: new Date(),
            is_active: true,
            change_reason: 'INITIAL_REGISTRATION'
          }, { transaction: t });
        }

        if (linkedWalkInCustId) {
          await customerVehicleAssociationService.associateWalkInCustomer({
            vehicleId: vehicle.id,
            walkInCustomerId: linkedWalkInCustId,
            transaction: t
          });
        }

        // Create Appointment for Core Appointment Workflow
        finalAppt = await Appointment.create({
          client_id: linkedClientId,
          vehicle_id: vehicle.id,
          problem_description: visitData.problem_description.trim(),
          status: 'pending',
          scheduled_date: new Date()
        }, { transaction: t });

        // Create visit under existing customer and link appointment_id
        finalVisit = await WalkInVisit.create({
          walk_in_customer_id: linkedWalkInCustId,
          vehicle_make: visitData.vehicle_make.trim(),
          vehicle_model: (visitData.vehicle_model || '').trim(),
          vehicle_year: visitData.vehicle_year || null,
          vehicle_license_plate: targetPlate || null,
          vehicle_vin: normVin,
          vehicle_color: visitData.vehicle_color ? visitData.vehicle_color.trim() : null,
          vehicle_transmission: targetTransmission,
          vehicle_fuel_type: targetFuelType,
          problem_description: visitData.problem_description.trim(),
          status: visitData.status || 'pending',
          appointment_id: finalAppt.id,
          notes: visitData.notes || null
        }, { transaction: t });

        await logAudit({
          req,
          action: 'WALKIN_IDENTITY_MATCH_CONFIRMED',
          entityType: is_permanent_user ? 'User' : 'WalkInCustomer',
          entityId: existing_customer_id,
          newValues: { visitId: finalVisit.id, appointmentId: finalAppt.id, vehicleId: vehicle.id, decision },
          transaction: t
        });
      } else {
        // decision === 'different_customer'
        const name = (customerData && customerData.name) || req.body.name;
        const phone = (customerData && customerData.phone) || req.body.phone;
        const notes = (customerData && customerData.notes) || req.body.notes;

        if (!name || !phone) {
          await t.rollback();
          return res.status(400).json({ message: 'اسم العميل ورقم الهاتف مطلوبان لإنشاء عميل جديد' });
        }

        const trimmedPhone = phone.trim();

        if (!/^7\d{8}$/.test(trimmedPhone)) {
          await t.rollback();
          return res.status(400).json({ message: 'يرجى إدخال رقم جوال يمني صحيح مكون من 9 أرقام يبدأ بـ 7' });
        }

        // RULE 6 PHONE OWNERSHIP GUARD:
        // Reject creation if the phone number is STILL assigned to another active identity
        const existingUserPhone = await User.findOne({ where: { phone: trimmedPhone }, transaction: t });
        const existingWalkInPhone = await WalkInCustomer.findOne({ where: { phone: trimmedPhone }, transaction: t });

        if (existingUserPhone || existingWalkInPhone) {
          await t.rollback();
          return res.status(409).json({
            message: `عذراً، رقم الجوال (${trimmedPhone}) مملوك حالياً لعميل آخر. بموجب قواعد ملكية الهاتف، يجب تحديث رقم جوال العميل السابق أولاً من إدارة العملاء قبل تخصيص الرقم لشخص آخر.`,
            conflictPhone: trimmedPhone,
            existingOwner: existingUserPhone ? { type: 'User', id: existingUserPhone.id, name: existingUserPhone.name } : { type: 'WalkInCustomer', id: existingWalkInPhone.id, name: existingWalkInPhone.name }
          });
        }

        finalCustomer = await WalkInCustomer.create({
          name: name.trim(),
          phone: trimmedPhone,
          notes: notes || null
        }, { transaction: t });

        const targetPlate = (visitData.vehicle_license_plate || visitData.license_plate || '').trim();
        const normPlate = targetPlate ? vehicleMatchingService.normalizePlate(targetPlate) : null;
        const cleanVin = visitData.vehicle_vin && String(visitData.vehicle_vin).trim() ? String(visitData.vehicle_vin).trim() : null;
        const normVin = cleanVin ? vehicleMatchingService.normalizeVin(cleanVin) : null;
        const targetTransmission = (visitData.vehicle_transmission || visitData.transmission || '').trim() || null;
        const targetFuelType = (visitData.vehicle_fuel_type || visitData.fuel_type || '').trim() || null;

        let vehicle = null;
        if (normPlate || normVin) {
          const match = await vehicleMatchingService.findPotentialVehicleMatch({
            vin: normVin,
            license_plate: normPlate,
            make: visitData.vehicle_make,
            model: visitData.vehicle_model,
            year: visitData.vehicle_year
          });

          if (match.hasMatch && match.vehicle) {
            vehicle = match.vehicle;
            if (match.isPlateUpdate && normPlate) {
              await vehicleMatchingService.updateVehiclePlateTimeline({
                vehicleId: vehicle.id,
                newPlate: normPlate,
                reason: 'PLATE_UPDATE',
                transaction: t
              });
            }
          }
        }

        if (!vehicle) {
          const finalPlate = normPlate || `WALKIN-PLT-${Date.now()}`;
          vehicle = await Vehicle.create({
            make: visitData.vehicle_make.trim(),
            model: (visitData.vehicle_model || '').trim(),
            year: visitData.vehicle_year ? parseInt(visitData.vehicle_year, 10) : null,
            license_plate: finalPlate,
            vin: normVin,
            color: visitData.vehicle_color ? visitData.vehicle_color.trim() : null,
            transmission: targetTransmission,
            fuel_type: targetFuelType
          }, { transaction: t });

          await VehiclePlateHistory.create({
            vehicle_id: vehicle.id,
            license_plate: finalPlate,
            start_date: new Date(),
            is_active: true,
            change_reason: 'INITIAL_REGISTRATION'
          }, { transaction: t });
        }

        await customerVehicleAssociationService.associateWalkInCustomer({
          vehicleId: vehicle.id,
          walkInCustomerId: finalCustomer.id,
          transaction: t
        });

        // Create Appointment for Core Appointment Workflow
        finalAppt = await Appointment.create({
          client_id: null,
          vehicle_id: vehicle.id,
          problem_description: visitData.problem_description.trim(),
          status: 'pending',
          scheduled_date: new Date()
        }, { transaction: t });

        finalVisit = await WalkInVisit.create({
          walk_in_customer_id: finalCustomer.id,
          vehicle_make: visitData.vehicle_make.trim(),
          vehicle_model: (visitData.vehicle_model || '').trim(),
          vehicle_year: visitData.vehicle_year || null,
          vehicle_license_plate: targetPlate || null,
          vehicle_vin: normVin,
          vehicle_color: visitData.vehicle_color ? visitData.vehicle_color.trim() : null,
          vehicle_transmission: targetTransmission,
          vehicle_fuel_type: targetFuelType,
          problem_description: visitData.problem_description.trim(),
          status: visitData.status || 'pending',
          appointment_id: finalAppt.id,
          notes: visitData.notes || null
        }, { transaction: t });

        await logAudit({
          req,
          action: 'WALKIN_IDENTITY_MATCH_REJECTED',
          entityType: 'WalkInCustomer',
          entityId: finalCustomer.id,
          newValues: { visitId: finalVisit.id, appointmentId: finalAppt.id, vehicleId: vehicle.id, existingCandidateId: existing_customer_id, decision },
          transaction: t
        });
      }

      await t.commit();

      res.status(decision === 'different_customer' ? 201 : 200).json({
        message: decision === 'same_customer' ? 'تم إقران الزيارة والموعد بالعميل بنجاح' : 'تم إنشاء عميل جديد وتسجيل الزيارة والموعد بنجاح',
        decision,
        customer: finalCustomer,
        visit: finalVisit,
        appointment: finalAppt
      });
    } catch (error) {
      await t.rollback();
      console.error('Error resolving walk-in match decision:', error);
      res.status(500).json({ message: 'خطأ أثناء معالجة قرار إقران العميل' });
    }
  },

  // POST /api/walk-in-customers/with-visit
  createCustomerWithVisit: async (req, res) => {
    try {
      const { name, phone, notes, vehicle_make, vehicle_model, vehicle_year, vehicle_license_plate, license_plate, vehicle_vin, vehicle_color, vehicle_transmission, transmission, vehicle_fuel_type, fuel_type, problem_description, visit_notes, bypass_match_check } = req.body;

      const targetTransmission = (vehicle_transmission || transmission || '').trim() || null;
      const targetFuelType = (vehicle_fuel_type || fuel_type || '').trim() || null;

      if (!name || !phone || !vehicle_make || !problem_description) {
        return res.status(400).json({ message: 'جميع البيانات الأساسية (الاسم، الهاتف، ماركة السيارة، وصف المشكلة) مطلوبة' });
      }

      const trimmedPhone = phone.trim();
      if (!/^7\d{8}$/.test(trimmedPhone)) {
        return res.status(400).json({ message: 'يرجى إدخال رقم جوال يمني صحيح مكون من 9 أرقام يبدأ بـ 7' });
      }
      const targetPlate = (vehicle_license_plate || license_plate || '').trim();

      // Perform candidate matching FIRST unless explicitly bypassed
      if (!bypass_match_check) {
        const matchResult = await findPotentialMatches({ name, phone: trimmedPhone, vehicle_license_plate: targetPlate, vehicle_vin });
        if (matchResult.hasPotentialMatches) {
          return res.status(409).json({
            message: 'يوجد سجل تاريخي محتمل لهذا العميل.',
            requiresIdentityConfirmation: true,
            matches: matchResult.matches
          });
        }
      }

      const t = await sequelize.transaction();

      try {
        const customer = await WalkInCustomer.create({
          name: name.trim(),
          phone: trimmedPhone,
          notes: notes || null
        }, { transaction: t });

        // Find or Create physical Vehicle entity
        const normPlate = targetPlate ? vehicleMatchingService.normalizePlate(targetPlate) : null;
        const cleanVin = vehicle_vin && String(vehicle_vin).trim() ? String(vehicle_vin).trim() : null;
        const normVin = cleanVin ? vehicleMatchingService.normalizeVin(cleanVin) : null;

        let vehicle = null;
        if (normPlate || normVin) {
          const match = await vehicleMatchingService.findPotentialVehicleMatch({
            vin: normVin,
            license_plate: normPlate,
            make: vehicle_make,
            model: vehicle_model,
            year: vehicle_year
          });

          if (match.hasMatch && match.vehicle) {
            vehicle = match.vehicle;
            if (match.isPlateUpdate && normPlate) {
              await vehicleMatchingService.updateVehiclePlateTimeline({
                vehicleId: vehicle.id,
                newPlate: normPlate,
                reason: 'PLATE_UPDATE',
                transaction: t
              });
            }
          }
        }

        if (!vehicle) {
          const finalPlate = normPlate || `WALKIN-PLT-${Date.now()}`;
          vehicle = await Vehicle.create({
            make: vehicle_make.trim(),
            model: (vehicle_model || '').trim(),
            year: vehicle_year ? parseInt(vehicle_year, 10) : null,
            license_plate: finalPlate,
            vin: normVin,
            color: vehicle_color ? vehicle_color.trim() : null,
            transmission: targetTransmission,
            fuel_type: targetFuelType
          }, { transaction: t });

          await VehiclePlateHistory.create({
            vehicle_id: vehicle.id,
            license_plate: finalPlate,
            start_date: new Date(),
            is_active: true,
            change_reason: 'INITIAL_REGISTRATION'
          }, { transaction: t });
        }

        // Associate WalkInCustomer with Vehicle via vehicle_walk_in_customers
        await customerVehicleAssociationService.associateWalkInCustomer({
          vehicleId: vehicle.id,
          walkInCustomerId: customer.id,
          transaction: t
        });

        // Atomic creation of Appointment to enter Core Appointment Workflow
        const appointment = await Appointment.create({
          client_id: null,
          vehicle_id: vehicle.id,
          problem_description: problem_description.trim(),
          status: 'pending',
          scheduled_date: new Date()
        }, { transaction: t });

        const visit = await WalkInVisit.create({
          walk_in_customer_id: customer.id,
          vehicle_make: vehicle_make.trim(),
          vehicle_model: (vehicle_model || '').trim(),
          vehicle_year: vehicle_year || null,
          vehicle_license_plate: targetPlate || null,
          vehicle_vin: normVin,
          vehicle_color: vehicle_color ? vehicle_color.trim() : null,
          vehicle_transmission: targetTransmission,
          vehicle_fuel_type: targetFuelType,
          problem_description: problem_description.trim(),
          status: 'pending',
          appointment_id: appointment.id,
          notes: visit_notes || null
        }, { transaction: t });

        await logAudit({
          req,
          action: 'WALKIN_CUSTOMER_CREATED',
          entityType: 'WalkInCustomer',
          entityId: customer.id,
          newValues: customer.toJSON(),
          transaction: t
        });

        await logAudit({
          req,
          action: 'WALKIN_VISIT_CREATED',
          entityType: 'WalkInVisit',
          entityId: visit.id,
          newValues: visit.toJSON(),
          transaction: t
        });

        await logAudit({
          req,
          action: 'APPOINTMENT_CREATED_FOR_WALKIN',
          entityType: 'Appointment',
          entityId: appointment.id,
          newValues: appointment.toJSON(),
          transaction: t
        });

        await t.commit();

        return res.status(201).json({
          message: 'تم تسجيل العميل والزيارة وإنشاء الموعد بنجاح',
          customer,
          visit,
          appointment,
          vehicle
        });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (error) {
      console.error('[WALK-IN ERROR DIAGNOSTIC]', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        errors: error.errors
      });
      const statusCode = error.statusCode || (error.name === 'SequelizeValidationError' ? 400 : 500);
      return res.status(statusCode).json({
        message: error.message || 'خطأ أثناء تسجيل العميل والزيارة',
        error: error.message
      });
    }
  },

  // POST /api/walk-in-visits
  createVisit: async (req, res) => {
    try {
      const {
        walk_in_customer_id,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_license_plate,
        vehicle_vin,
        vehicle_color,
        problem_description,
        status,
        appointment_id,
        notes
      } = req.body;

      if (!walk_in_customer_id) {
        return res.status(400).json({ message: 'معرف العميل الحضوري مطلوب' });
      }

      const customer = await WalkInCustomer.findByPk(walk_in_customer_id);
      if (!customer) {
        return res.status(404).json({ message: 'العميل الحضوري غير موجود' });
      }

      if (!vehicle_make || !vehicle_model || !problem_description) {
        return res.status(400).json({ message: 'ماركة السيارة، الموديل، ووصف المشكلة مطلوبان' });
      }

      const visit = await WalkInVisit.create({
        walk_in_customer_id: customer.id,
        vehicle_make: vehicle_make.trim(),
        vehicle_model: vehicle_model.trim(),
        vehicle_year: vehicle_year || null,
        vehicle_license_plate: vehicle_license_plate ? vehicle_license_plate.trim() : null,
        vehicle_vin: vehicle_vin ? vehicle_vin.trim() : null,
        vehicle_color: vehicle_color ? vehicle_color.trim() : null,
        problem_description: problem_description.trim(),
        status: status || 'pending',
        appointment_id: appointment_id || null,
        notes: notes || null
      });

      await logAudit({
        req,
        action: 'WALKIN_VISIT_CREATED',
        entityType: 'WalkInVisit',
        entityId: visit.id,
        newValues: visit.toJSON()
      });

      res.status(201).json({
        message: 'تم إضافة الزيارة بنجاح',
        visit
      });
    } catch (error) {
      console.error('Error creating walk-in visit:', error);
      res.status(500).json({ message: 'خطأ أثناء تسجيل الزيارة' });
    }
  },

  // GET /api/walk-in-visits/:id
  getVisit: async (req, res) => {
    try {
      const visit = await WalkInVisit.findByPk(req.params.id, {
        include: [
          { model: WalkInCustomer, as: 'customer' },
          {
            model: Appointment,
            as: 'appointment',
            include: [{ model: Invoice, as: 'invoice' }]
          }
        ]
      });

      if (!visit) {
        return res.status(404).json({ message: 'زيارة العميل غير موجودة' });
      }

      res.json(visit);
    } catch (error) {
      console.error('Error fetching walk-in visit:', error);
      res.status(500).json({ message: 'خطأ في جلب بيانات الزيارة' });
    }
  },

  // PUT /api/walk-in-visits/:id
  updateVisit: async (req, res) => {
    try {
      const visit = await WalkInVisit.findByPk(req.params.id);
      if (!visit) {
        return res.status(404).json({ message: 'زيارة العميل غير موجودة' });
      }

      const oldValues = visit.toJSON();
      const updates = {};

      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.problem_description !== undefined) updates.problem_description = req.body.problem_description.trim();
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.vehicle_make !== undefined) updates.vehicle_make = req.body.vehicle_make.trim();
      if (req.body.vehicle_model !== undefined) updates.vehicle_model = req.body.vehicle_model.trim();
      if (req.body.vehicle_year !== undefined) updates.vehicle_year = req.body.vehicle_year;
      if (req.body.vehicle_license_plate !== undefined) updates.vehicle_license_plate = req.body.vehicle_license_plate ? req.body.vehicle_license_plate.trim() : null;
      if (req.body.vehicle_vin !== undefined) updates.vehicle_vin = req.body.vehicle_vin ? req.body.vehicle_vin.trim() : null;
      if (req.body.vehicle_color !== undefined) updates.vehicle_color = req.body.vehicle_color ? req.body.vehicle_color.trim() : null;

      await visit.update(updates);

      await logAudit({
        req,
        action: 'WALKIN_VISIT_UPDATED',
        entityType: 'WalkInVisit',
        entityId: visit.id,
        oldValues,
        newValues: visit.toJSON()
      });

      res.json({ message: 'تم تحديث الزيارة بنجاح', visit });
    } catch (error) {
      console.error('Error updating walk-in visit:', error);
      res.status(500).json({ message: 'خطأ أثناء تحديث الزيارة' });
    }
  }
};
