const { Appointment, User, Vehicle, WalkInVisit, WalkInCustomer } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');
const { 
  VALID_STATUSES, 
  ALLOWED_TRANSITIONS, 
  validateAndAssertTransition 
} = require('../services/appointmentStateMachine');
const { findActiveDuplicateAppointment } = require('../services/duplicateAppointmentService');

const helperGetDayName = (d) => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[d.getDay()];
};

const helperGetMonthName = (d) => {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return months[d.getMonth()];
};

module.exports = {
  // GET /api/appointments/slots
  getAvailableSlots: async (req, res) => {
    try {
      const availableDates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        availableDates.push({
          dayName: helperGetDayName(d),
          dayNumber: d.getDate().toString(),
          month: helperGetMonthName(d)
        });
      }

      let formattedVehicles = [];
      if (req.user && req.user.id) {
        const vehicles = await Vehicle.findAll({ where: { client_id: req.user.id } });
        formattedVehicles = vehicles.map(v => ({
          id: v.id,
          model: `${v.make} ${v.model}`,
          plateNumber: v.license_plate,
          lastServiceDate: v.created_at
        }));
      }

      const slotsData = {
        vehicles: formattedVehicles,
        availableDates,
        availableTimeSlots: [
          '09:00 AM',
          '11:30 AM',
          '02:00 PM',
          '04:30 PM'
        ],
        services: [
          { id: 'srv_1', title: 'تغيير زيت المحرك', icon: 'oil_barrel' },
          { id: 'srv_2', title: 'المكابح', icon: 'eject' },
          { id: 'srv_3', title: 'فحص الكهرباء', icon: 'electric_bolt' },
          { id: 'srv_4', title: 'إصلاح التكييف', icon: 'ac_unit' }
        ]
      };

      res.json(slotsData);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/appointments
  createAppointment: async (req, res) => {
    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();
    try {
      const { vehicle_id, appointment_date, scheduled_date, description, problem_description } = req.body;
      const targetVehicleId = vehicle_id;
      const targetDate = appointment_date || scheduled_date;
      const targetDesc = description || problem_description;
      
      if (!targetVehicleId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'vehicle_id is required' });
      }

      // Check if client is attempting to set privileged fields
      if (req.user && req.user.role === 'client') {
        const privilegedFields = ['status', 'mechanic_id', 'mechanic_ids', 'financial_status', 'payment_status'];
        const hasPrivileged = privilegedFields.some(f => req.body[f] !== undefined);
        if (hasPrivileged) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Clients cannot set privileged appointment fields' });
        }
      }

      // Ownership Verification: Check if vehicle belongs to current user
      let vehicle;
      if (req.user && req.user.role === 'client') {
        vehicle = await Vehicle.findOne({
          where: { id: targetVehicleId, client_id: req.user.id },
          transaction
        });
        if (!vehicle) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
        }
      } else {
        vehicle = await Vehicle.findByPk(targetVehicleId, { transaction });
        if (!vehicle) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Vehicle not found' });
        }
      }

      const clientId = (req.user && req.user.role === 'client') ? req.user.id : (vehicle.client_id || req.user.id);

      // INTELLIGENT DUPLICATE PREVENTION CHECK (Rule D & Concurrency Protection)
      const existingDuplicate = await findActiveDuplicateAppointment({
        clientId,
        vehicleId: targetVehicleId,
        problemDescription: targetDesc || 'صيانة عامة',
        transaction
      });

      if (existingDuplicate) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'يوجد بالفعل موعد نشط مطابق لهذه السيارة ونفس طلب الصيانة.',
          isDuplicate: true,
          duplicateAppointment: {
            existingAppointmentId: existingDuplicate.id,
            existingAppointmentStatus: existingDuplicate.status,
            scheduledDate: existingDuplicate.scheduled_date,
            problemDescription: existingDuplicate.problem_description
          }
        });
      }

      const newAppointment = await Appointment.create({
        client_id: clientId,
        vehicle_id: targetVehicleId,
        scheduled_date: targetDate || new Date(),
        problem_description: targetDesc || 'صيانة عامة',
        status: 'pending'
      }, { transaction });

      await transaction.commit();

      await logAudit({
        req,
        action: 'APPOINTMENT_CREATED',
        entityType: 'Appointment',
        entityId: newAppointment.id,
        newValues: {
          client_id: clientId,
          vehicle_id: targetVehicleId,
          scheduled_date: newAppointment.scheduled_date,
          problem_description: newAppointment.problem_description,
          status: 'pending'
        }
      });
      
      res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
    } catch (error) {
      if (transaction && !transaction.finished) {
        try { await transaction.rollback(); } catch (e) {}
      }
      console.error('Error creating appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/appointments/my
  getMyAppointments: async (req, res) => {
    try {
      const { TechnicalReport, RequiredPart, SparePart, Review } = require('../models');
      const appointments = await Appointment.findAll({
        where: { client_id: req.user.id },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: Review, as: 'review', attributes: ['id', 'rating', 'comment'] },
          { 
            model: TechnicalReport, 
            as: 'report',
            include: [
              {
                model: RequiredPart,
                as: 'requestedParts',
                include: [
                  { model: SparePart, as: 'partDetails' }
                ]
              }
            ]
          }
        ],
        order: [['scheduled_date', 'DESC']]
      });
      
      const formatted = appointments.map(app => {
        let requestedParts = [];
        if (app.report && app.report.requestedParts) {
          requestedParts = app.report.requestedParts.map(rp => ({
            id: rp.id,
            part_id: rp.part_id,
            name: rp.partDetails?.name || 'قطعة غير معروفة',
            quantity: rp.quantity,
            price: rp.partDetails?.price || 0,
            status: rp.status || 'pending'
          }));
        }

        return {
          id: app.id,
          date: app.scheduled_date || app.created_at,
          time: app.scheduled_date || app.created_at,
          vehicleMake: app.vehicle?.make || 'غير معروف',
          vehicleModel: app.vehicle?.model || '',
          plateNumber: app.vehicle?.license_plate || '',
          description: app.problem_description,
          status: app.status,
          cancellation_reason: app.cancellation_reason,
          hasReview: !!app.review,
          review: app.review ? { id: app.review.id, rating: app.review.rating, comment: app.review.comment } : null,
          requestedParts
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching my appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/appointments/assigned
  getAssignedTasks: async (req, res) => {
    try {
      const { TechnicalReport, RequiredPart, SparePart, AppointmentMechanic } = require('../models');
      
      const assignedMechRecords = await AppointmentMechanic.findAll({
        where: { mechanic_id: req.user.id },
        attributes: ['appointment_id']
      });
      const assignedAppIds = assignedMechRecords.map(am => am.appointment_id);

      const appointments = await Appointment.findAll({
        where: {
          [Op.or]: [
            { mechanic_id: req.user.id },
            { id: { [Op.in]: assignedAppIds.length > 0 ? assignedAppIds : [0] } }
          ]
        },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'image_url'] },
          { model: User, as: 'mechanics', attributes: ['id', 'name', 'phone'], through: { attributes: [] } },
          { 
            model: TechnicalReport, 
            as: 'report',
            include: [
              {
                model: RequiredPart,
                as: 'requestedParts',
                include: [
                  { model: SparePart, as: 'partDetails' }
                ]
              }
            ]
          }
        ],
        order: [['scheduled_date', 'ASC']]
      });

      const formatted = appointments.map(app => {
        let requestedParts = [];
        if (app.report && app.report.requestedParts) {
          requestedParts = app.report.requestedParts.map(rp => ({
            id: rp.id,
            part_id: rp.part_id,
            name: rp.partDetails?.name || 'قطعة غير معروفة',
            sku: rp.partDetails?.part_number || '-',
            quantity: rp.quantity,
            price: rp.partDetails?.price || 0,
            status: rp.status || 'pending'
          }));
        }

        const report = app.report;
        const isInspectionComplete = !!(
          report &&
          report.diagnostics && report.diagnostics.trim().length > 0 &&
          report.repair_plan && report.repair_plan.trim().length > 0 &&
          report.estimated_labor_cost !== null && report.estimated_labor_cost !== undefined &&
          !isNaN(Number(report.estimated_labor_cost)) && Number(report.estimated_labor_cost) >= 0
        );

        let reworkHistory = [];
        if (report && report.rework_history) {
          try {
            reworkHistory = typeof report.rework_history === 'string' ? JSON.parse(report.rework_history) : report.rework_history;
            if (!Array.isArray(reworkHistory)) reworkHistory = [];
          } catch (e) {
            reworkHistory = [];
          }
        }
        const latestRework = reworkHistory.length > 0 ? reworkHistory[reworkHistory.length - 1] : null;

        return {
          id: `APP-${app.id}`,
          appointment_id: app.id,
          vehicle_id: app.vehicle?.id || null,
          vehicle: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim(),
          vehicle_image: app.vehicle?.image_url || null,
          plate: app.vehicle?.license_plate || '',
          clientIssue: app.problem_description,
          status: app.status,
          cancellation_reason: app.cancellation_reason,
          rework_notes: latestRework ? latestRework.admin_notes : null,
          rework_history: reworkHistory,
          hasReport: !!app.report,
          reportDetails: report ? {
            id: report.id,
            diagnostics: report.diagnostics || '',
            repair_plan: report.repair_plan || '',
            estimated_labor_cost: report.estimated_labor_cost !== null ? parseFloat(report.estimated_labor_cost) : '',
            urgency_level: report.urgency_level || 'normal',
            vehicle_condition: report.vehicle_condition || '',
            technician_notes: report.technician_notes || '',
            photos: report.photos || [],
            rework_history: reworkHistory,
            rework_notes: latestRework ? latestRework.admin_notes : null
          } : null,
          isInspectionComplete,
          requestedParts,
          timeAssigned: app.scheduled_date || app.created_at,
          date: app.scheduled_date || app.created_at
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/appointments
  getAllAppointments: async (req, res) => {
    try {
      const search = req.query.search;
      let whereClause = {};

      if (search) {
        whereClause = {
          [Op.or]: [
            { '$customer.name$': { [Op.like]: `%${search}%` } },
            { '$customer.phone$': { [Op.like]: `%${search}%` } },
            { '$vehicle.license_plate$': { [Op.like]: `%${search}%` } },
            { '$walkInVisit.vehicle_license_plate$': { [Op.like]: `%${search}%` } },
            { '$walkInVisit.customer.name$': { [Op.like]: `%${search}%` } },
            { '$walkInVisit.customer.phone$': { [Op.like]: `%${search}%` } }
          ]
        };
      }

      const appointments = await Appointment.findAll({
        where: whereClause,
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'image_url'] },
          { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
          { model: User, as: 'mechanic', attributes: ['id', 'name'] },
          { model: User, as: 'mechanics', attributes: ['id', 'name'], through: { attributes: [] } },
          {
            model: WalkInVisit,
            as: 'walkInVisit',
            include: [{ model: WalkInCustomer, as: 'customer' }]
          }
        ],
        order: [['scheduled_date', 'ASC'], ['created_at', 'DESC']]
      });

      const formatted = await Promise.all(appointments.map(async (app) => {
        const walkIn = app.walkInVisit;
        const walkInCust = walkIn ? walkIn.customer : null;

        let resolvedVehicleId = app.vehicle_id ? Number(app.vehicle_id) : null;
        let vehicleMake = app.vehicle?.make || '';
        let vehicleModel = app.vehicle?.model || '';
        let vehiclePlate = app.vehicle?.license_plate || '';

        if (!resolvedVehicleId && walkIn) {
          vehicleMake = walkIn.vehicle_make || '';
          vehicleModel = walkIn.vehicle_model || '';
          vehiclePlate = walkIn.vehicle_license_plate || '';
          
          try {
            const vehicleMatchingService = require('../services/vehicleMatchingService');
            const normPlate = vehiclePlate ? vehicleMatchingService.normalizePlate(vehiclePlate) : null;
            const normVin = walkIn.vehicle_vin ? vehicleMatchingService.normalizeVin(walkIn.vehicle_vin) : null;
            
            let existingV = await vehicleMatchingService.findPotentialVehicleMatch({
              vin: normVin,
              license_plate: normPlate,
              make: vehicleMake,
              model: vehicleModel,
              year: walkIn.vehicle_year
            });
            
            let physVehicle = existingV.hasMatch ? existingV.vehicle : null;
            if (!physVehicle && (vehicleMake || vehicleModel || normPlate)) {
              const finalPlate = normPlate || `WALKIN-PLT-${Date.now()}`;
              physVehicle = await Vehicle.create({
                client_id: app.client_id || null,
                make: vehicleMake || 'غير محدد',
                model: vehicleModel || 'غير محدد',
                year: walkIn.vehicle_year || null,
                license_plate: finalPlate,
                vin: normVin || null,
                color: walkIn.vehicle_color || null,
                transmission: walkIn.vehicle_transmission || null,
                fuel_type: walkIn.vehicle_fuel_type || null
              });
            }
            if (physVehicle) {
              resolvedVehicleId = Number(physVehicle.id);
              app.vehicle_id = physVehicle.id;
              await app.update({ vehicle_id: physVehicle.id });
            }
          } catch (e) {
            console.error('Error resolving walkin vehicle for appt:', e);
          }
        }

        const clientName = app.customer?.name || (walkInCust ? walkInCust.name : (walkIn ? 'عميل مباشر' : 'غير معروف'));
        const clientPhone = app.customer?.phone || (walkInCust ? walkInCust.phone : '');
        const carStr = `${vehicleMake} ${vehicleModel} ${vehiclePlate ? '- ' + vehiclePlate : ''}`.trim() || 'غير محددة';

        return {
          id: app.id.toString(),
          client_id: app.client_id,
          vehicle_id: resolvedVehicleId,
          walk_in_visit_id: walkIn ? walkIn.id : null,
          walk_in_customer_id: walkInCust ? walkInCust.id : null,
          is_walk_in: !app.client_id || !!walkIn,
          clientName,
          clientPhone,
          car: carStr,
          vehicleMake,
          vehicleModel,
          vehiclePlate,
          vehicle_image: app.vehicle?.image_url || null,
          vehicle_url: app.vehicle?.image_url || null,
          issue: app.problem_description || (walkIn ? walkIn.problem_description : ''),
          time: app.scheduled_date || app.created_at,
          date: app.scheduled_date || app.created_at,
          status: app.status,
          cancellation_reason: app.cancellation_reason,
          mechanic_id: app.mechanic_id,
          mechanics: app.mechanics && app.mechanics.length > 0 ? app.mechanics : (app.mechanic ? [app.mechanic] : [])
        };
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/appointments/:id
  updateAppointment: async (req, res) => {
    const { AppointmentMechanic, sequelize } = require('../models');
    const transaction = await sequelize.transaction();
    try {
      const appointment = await Appointment.findByPk(req.params.id, { transaction });
      if (!appointment) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Role Verification: Client is forbidden from updating appointments via this endpoint
      if (req.user && req.user.role === 'client') {
        await transaction.rollback();
        return res.status(403).json({ message: 'Access forbidden: clients cannot update appointments via this endpoint' });
      }

      // Check if current user is assigned to this appointment
      let isAssignedMechanic = false;
      if (req.user && req.user.role === 'mechanic') {
        if (appointment.mechanic_id === req.user.id) {
          isAssignedMechanic = true;
        } else {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id },
            transaction
          });
          if (amRecord) isAssignedMechanic = true;
        }

        if (!isAssignedMechanic) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Appointment not found' });
        }

        // Mechanics can ONLY update status. Any attempt to modify restricted fields is rejected.
        const restrictedFields = ['mechanic_id', 'mechanic_ids', 'client_id', 'vehicle_id', 'scheduled_date', 'appointment_date', 'problem_description'];
        const hasRestrictedAttempt = restrictedFields.some(field => req.body[field] !== undefined);
        if (hasRestrictedAttempt) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Mechanics can only update appointment status' });
        }
      }

      const oldStatus = appointment.status;
      const oldMechanicId = appointment.mechanic_id;
      const { status, mechanic_id, mechanic_ids, cancellation_reason } = req.body;
      
      if (status !== undefined && status !== oldStatus) {
        if (status === 'completed') {
          if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
            await transaction.rollback();
            return res.status(403).json({ message: 'ليس لديك صلاحية لتسليم السيارة.' });
          }
        }

        // ENFORCE CENTRALIZED STATE MACHINE TRANSITION & TRANSITION GUARDS
        try {
          await validateAndAssertTransition({
            appointment,
            newStatus: status,
            reqBody: req.body,
            transaction
          });
        } catch (guardErr) {
          await transaction.rollback();
          return res.status(guardErr.statusCode || 400).json({ message: guardErr.message });
        }

        appointment.status = status;
        if (status === 'completed') {
          appointment.delivered_at = new Date();
        }

        if (status === 'cancelled') {
          const reason = cancellation_reason || req.body.reason;
          if (reason) {
            appointment.cancellation_reason = reason;
          }
        }
      } else if (cancellation_reason && appointment.status === 'cancelled') {
        appointment.cancellation_reason = cancellation_reason;
      }

      let mechanicAssignmentChanged = false;
      let assignedMechanicIds = [];

      // Handle Multi-Mechanic assignment array
      if (mechanic_ids !== undefined && Array.isArray(mechanic_ids)) {
        const uniqueMechanicIds = Array.from(new Set(mechanic_ids.map(id => Number(id))));

        if (uniqueMechanicIds.length > 0) {
          const validMechanics = await User.findAll({
            where: { id: uniqueMechanicIds, role: 'mechanic', status: 'active' },
            transaction
          });
          if (validMechanics.length !== uniqueMechanicIds.length) {
            await transaction.rollback();
            return res.status(400).json({ message: 'One or more mechanic IDs are invalid, inactive, or not mechanics' });
          }
        }

        await AppointmentMechanic.destroy({ where: { appointment_id: appointment.id }, transaction });
        if (uniqueMechanicIds.length > 0) {
          const amRecords = uniqueMechanicIds.map(mId => ({
            appointment_id: appointment.id,
            mechanic_id: mId,
            assigned_at: new Date()
          }));
          await AppointmentMechanic.bulkCreate(amRecords, { transaction });
          appointment.mechanic_id = uniqueMechanicIds[0];
          assignedMechanicIds = uniqueMechanicIds;
        } else {
          appointment.mechanic_id = null;
        }
        mechanicAssignmentChanged = true;
      } else if (mechanic_id !== undefined) {
        if (mechanic_id !== null) {
          const mechanic = await User.findOne({ where: { id: mechanic_id, role: 'mechanic', status: 'active' }, transaction });
          if (!mechanic) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Mechanic not found or invalid role' });
          }
          await AppointmentMechanic.destroy({ where: { appointment_id: appointment.id }, transaction });
          await AppointmentMechanic.create({
            appointment_id: appointment.id,
            mechanic_id,
            assigned_at: new Date()
          }, { transaction });
          assignedMechanicIds = [mechanic_id];
        } else {
          await AppointmentMechanic.destroy({ where: { appointment_id: appointment.id }, transaction });
        }
        appointment.mechanic_id = mechanic_id;
        mechanicAssignmentChanged = true;
      }

      await appointment.save({ transaction });
      await transaction.commit();

      // Audit Log triggers
      if (status !== undefined && status !== oldStatus) {
        await logAudit({
          req,
          action: 'APPOINTMENT_STATUS_CHANGED',
          entityType: 'Appointment',
          entityId: appointment.id,
          oldValues: { status: oldStatus },
          newValues: { status: appointment.status, cancellation_reason: appointment.cancellation_reason }
        });
      }

      if (mechanicAssignmentChanged) {
        await logAudit({
          req,
          action: assignedMechanicIds.length > 0 ? 'APPOINTMENT_MECHANIC_ASSIGNED' : 'APPOINTMENT_MECHANIC_REMOVED',
          entityType: 'Appointment',
          entityId: appointment.id,
          oldValues: { mechanic_id: oldMechanicId },
          newValues: { mechanic_ids: assignedMechanicIds, primary_mechanic_id: appointment.mechanic_id }
        });
      }

      const updatedAppointment = await Appointment.findByPk(appointment.id, {
        include: [
          { model: User, as: 'mechanics', attributes: ['id', 'name'], through: { attributes: [] } }
        ]
      });

      res.json({ message: 'Appointment updated successfully', appointment: updatedAppointment });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/appointments/:id
  getAppointmentById: async (req, res) => {
    try {
      const { TechnicalReport, RequiredPart, SparePart, AppointmentMechanic } = require('../models');
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: User, as: 'mechanic', attributes: ['id', 'name'] },
          { model: User, as: 'mechanics', attributes: ['id', 'name', 'phone'], through: { attributes: [] } },
          {
            model: WalkInVisit,
            as: 'walkInVisit',
            include: [{ model: WalkInCustomer, as: 'customer' }]
          },
          { 
            model: TechnicalReport, 
            as: 'report',
            include: [
              {
                model: RequiredPart,
                as: 'requestedParts',
                include: [
                  { model: SparePart, as: 'partDetails' }
                ]
              }
            ]
          }
        ]
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      if (req.user && req.user.role === 'client') {
        if (appointment.client_id !== req.user.id) {
          return res.status(404).json({ message: 'Appointment not found' });
        }
      }

      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = appointment.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id }
          });
          if (amRecord) isAssigned = true;
        }
        if (!isAssigned) {
          return res.status(404).json({ message: 'Appointment not found' });
        }
      }

      let requestedParts = [];
      if (appointment.report && appointment.report.requestedParts) {
        requestedParts = appointment.report.requestedParts.map(rp => ({
          id: rp.id,
          part_id: rp.part_id,
          name: rp.partDetails?.name || 'قطعة غير معروفة',
          part_number: rp.partDetails?.part_number || '',
          quantity: rp.quantity,
          stock_quantity: rp.partDetails?.stock_quantity !== undefined ? rp.partDetails.stock_quantity : null,
          price: rp.partDetails?.price || 0,
          status: rp.status || 'pending'
        }));
      }

      const walkIn = appointment.walkInVisit;
      const walkInCust = walkIn ? walkIn.customer : null;

      const clientName = appointment.customer?.name || (walkInCust ? walkInCust.name : (walkIn ? 'عميل مباشر' : 'غير معروف'));
      const clientPhone = appointment.customer?.phone || (walkInCust ? walkInCust.phone : '');

      let vehicleMake = appointment.vehicle?.make || '';
      let vehicleModel = appointment.vehicle?.model || '';
      let vehiclePlate = appointment.vehicle?.license_plate || '';

      if (!appointment.vehicle && walkIn) {
        vehicleMake = walkIn.vehicle_make || '';
        vehicleModel = walkIn.vehicle_model || '';
        vehiclePlate = walkIn.vehicle_license_plate || '';
      }

      const carStr = `${vehicleMake} ${vehicleModel} ${vehiclePlate ? '- ' + vehiclePlate : ''}`.trim() || 'غير محددة';

      let appReworkHistory = [];
      if (appointment.report && appointment.report.rework_history) {
        try {
          appReworkHistory = typeof appointment.report.rework_history === 'string' ? JSON.parse(appointment.report.rework_history) : appointment.report.rework_history;
          if (!Array.isArray(appReworkHistory)) appReworkHistory = [];
        } catch (e) {
          appReworkHistory = [];
        }
      }
      const appLatestRework = appReworkHistory.length > 0 ? appReworkHistory[appReworkHistory.length - 1] : null;

      const formatted = {
        id: appointment.id,
        client_id: appointment.client_id,
        vehicle_id: appointment.vehicle_id,
        walk_in_visit_id: walkIn ? walkIn.id : null,
        is_walk_in: !appointment.client_id || !!walkIn,
        clientName,
        clientPhone,
        car: carStr,
        vehicleMake,
        vehicleModel,
        vehiclePlate,
        issue: appointment.problem_description || (walkIn ? walkIn.problem_description : ''),
        time: appointment.scheduled_date || appointment.created_at,
        date: appointment.scheduled_date || appointment.created_at,
        status: appointment.status,
        cancellation_reason: appointment.cancellation_reason,
        rework_notes: appLatestRework ? appLatestRework.admin_notes : null,
        rework_history: appReworkHistory,
        mechanicName: appointment.mechanic?.name || (appointment.mechanics && appointment.mechanics[0]?.name) || 'غير محدد',
        mechanics: appointment.mechanics || [],
        report: appointment.report ? {
          id: appointment.report.id,
          diagnostics: appointment.report.diagnostics,
          repair_plan: appointment.report.repair_plan,
          estimated_labor_cost: appointment.report.estimated_labor_cost,
          urgency_level: appointment.report.urgency_level,
          odometer: appointment.report.odometer,
          obd2_codes: appointment.report.obd2_codes,
          visual_notes: appointment.report.visual_notes,
          rework_history: appReworkHistory,
          rework_notes: appLatestRework ? appLatestRework.admin_notes : null
        } : null,
        requestedParts
      };

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/appointments/:id/handover
  handoverAppointment: async (req, res) => {
    try {
      const HandoverService = require('../services/handoverService');
      const result = await HandoverService.performHandover({
        appointment_id: req.params.id,
        handover_notes: req.body.handover_notes || req.body.notes,
        req
      });
      res.json(result);
    } catch (error) {
      if (!error.statusCode || error.statusCode >= 500) {
        console.error('Error performing vehicle handover:', error);
      }
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },

  // POST /api/appointments/:id/rework
  requestRework: async (req, res) => {
    const { TechnicalReport, sequelize } = require('../models');
    const transaction = await sequelize.transaction();
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        await transaction.rollback();
        return res.status(403).json({ message: 'غير مصرح لك بطلب إعادة الإصلاح.' });
      }

      const { rework_notes, notes } = req.body;
      const notesInput = (rework_notes || notes || '').trim();

      if (!notesInput) {
        await transaction.rollback();
        return res.status(400).json({ message: 'يرجى كتابة ملاحظات وتعليمات إعادة الإصلاح.' });
      }

      const appointment = await Appointment.findByPk(req.params.id, { transaction });
      if (!appointment) {
        await transaction.rollback();
        return res.status(404).json({ message: 'الموعد غير موجود' });
      }

      if (appointment.status !== 'ready_for_pickup') {
        await transaction.rollback();
        return res.status(400).json({ message: 'يمكن إعادة المركبة إلى الإصلاح فقط عندما تكون في حالة جاهز للاستلام.' });
      }

      let report = await TechnicalReport.findOne({
        where: { appointment_id: appointment.id },
        transaction
      });

      if (!report) {
        report = await TechnicalReport.create({
          appointment_id: appointment.id,
          mechanic_id: appointment.mechanic_id,
          diagnostics: 'فحص ابتدائي مسبق',
          repair_plan: 'إصلاح مسبق'
        }, { transaction });
      }

      let currentHistory = [];
      if (report.rework_history) {
        try {
          currentHistory = typeof report.rework_history === 'string' ? JSON.parse(report.rework_history) : report.rework_history;
          if (!Array.isArray(currentHistory)) currentHistory = [];
        } catch (e) {
          currentHistory = [];
        }
      }

      const newEntry = {
        id: currentHistory.length + 1,
        admin_notes: notesInput,
        requested_at: new Date(),
        requested_by: req.user.name || 'الإدارة',
        mechanic_notes: null,
        status: 'pending_rework'
      };

      currentHistory.push(newEntry);

      await report.update({
        rework_history: JSON.stringify(currentHistory)
      }, { transaction });

      await appointment.update({
        status: 'in_progress'
      }, { transaction });

      await transaction.commit();

      await logAudit({
        req,
        action: 'APPOINTMENT_REWORK_REQUESTED',
        entityType: 'Appointment',
        entityId: appointment.id,
        newValues: { status: 'in_progress', rework_notes: notesInput }
      });

      res.json({
        message: 'تمت إعادة المركبة إلى قسم الإصلاح بنجاح.',
        appointment,
        reworkEntry: newEntry
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        try { await transaction.rollback(); } catch (e) {}
      }
      console.error('Error requesting rework:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
