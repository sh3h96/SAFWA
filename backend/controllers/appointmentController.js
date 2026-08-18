const { Appointment, User, Vehicle } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');

const VALID_STATUSES = [
  'pending', 
  'awaiting_assignment', 
  'under_inspection', 
  'in_progress', 
  'waiting_parts', 
  'ready_for_pickup', 
  'completed', 
  'cancelled'
];

const ALLOWED_TRANSITIONS = {
  pending: ['awaiting_assignment', 'under_inspection', 'in_progress', 'cancelled'],
  awaiting_assignment: ['under_inspection', 'in_progress', 'cancelled'],
  under_inspection: ['in_progress', 'waiting_parts', 'ready_for_pickup', 'completed', 'cancelled'],
  in_progress: ['waiting_parts', 'ready_for_pickup', 'completed', 'cancelled'],
  waiting_parts: ['under_inspection', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled'],
  ready_for_pickup: ['completed', 'in_progress', 'cancelled'],
  completed: [],
  cancelled: []
};

module.exports = {
  // GET /api/appointments/slots
  getAvailableSlots: async (req, res) => {
    try {
      // Generate next 5 days dynamically
      const availableDates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        availableDates.push({
          dayName: d.toLocaleDateString('ar-SA', { weekday: 'long' }),
          dayNumber: d.getDate().toString(),
          month: d.toLocaleDateString('ar-SA', { month: 'long' })
        });
      }

      // Fetch customer vehicles if user is authenticated, else []
      let formattedVehicles = [];
      if (req.user && req.user.id) {
        const vehicles = await Vehicle.findAll({ where: { client_id: req.user.id } });
        formattedVehicles = vehicles.map(v => ({
          id: v.id,
          model: `${v.make} ${v.model}`,
          plateNumber: v.license_plate,
          lastServiceDate: new Date(v.created_at).toLocaleDateString('ar-SA')
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
    try {
      const { vehicle_id, appointment_date, scheduled_date, description, problem_description } = req.body;
      const targetVehicleId = vehicle_id;
      const targetDate = appointment_date || scheduled_date;
      const targetDesc = description || problem_description;
      
      if (!targetVehicleId) {
        return res.status(400).json({ message: 'vehicle_id is required' });
      }

      // Check if client is attempting to set privileged fields
      if (req.user && req.user.role === 'client') {
        const privilegedFields = ['status', 'mechanic_id', 'mechanic_ids', 'financial_status', 'payment_status'];
        const hasPrivileged = privilegedFields.some(f => req.body[f] !== undefined);
        if (hasPrivileged) {
          return res.status(400).json({ message: 'Clients cannot set privileged appointment fields' });
        }
      }

      // Ownership Verification: Check if vehicle belongs to current user
      let vehicle;
      if (req.user && req.user.role === 'client') {
        vehicle = await Vehicle.findOne({
          where: { id: targetVehicleId, client_id: req.user.id }
        });
        if (!vehicle) {
          return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
        }
      } else {
        vehicle = await Vehicle.findByPk(targetVehicleId);
        if (!vehicle) {
          return res.status(404).json({ message: 'Vehicle not found' });
        }
      }

      const clientId = (req.user && req.user.role === 'client') ? req.user.id : (vehicle.client_id || req.user.id);

      const newAppointment = await Appointment.create({
        client_id: clientId,
        vehicle_id: targetVehicleId,
        scheduled_date: targetDate || new Date(),
        problem_description: targetDesc || 'صيانة عامة',
        status: 'pending'
      });

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
          date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA'),
          time: new Date(app.scheduled_date || app.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          vehicleMake: app.vehicle?.make || 'غير معروف',
          vehicleModel: app.vehicle?.model || '',
          plateNumber: app.vehicle?.license_plate || '',
          description: app.problem_description,
          status: app.status,
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
      
      // Fetch appointment IDs assigned to mechanic via join table
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
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
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
            quantity: rp.quantity,
            price: rp.partDetails?.price || 0,
            status: rp.status || 'pending'
          }));
        }

        return {
          id: `APP-${app.id}`,
          appointment_id: app.id,
          vehicle: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim(),
          plate: app.vehicle?.license_plate || '',
          clientIssue: app.problem_description,
          status: app.status,
          hasReport: !!app.report,
          requestedParts,
          timeAssigned: new Date(app.scheduled_date || app.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA')
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
            { '$vehicle.license_plate$': { [Op.like]: `%${search}%` } }
          ]
        };
      }

      const appointments = await Appointment.findAll({
        where: whereClause,
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: User, as: 'mechanic', attributes: ['id', 'name'] },
          { model: User, as: 'mechanics', attributes: ['id', 'name'], through: { attributes: [] } }
        ],
        order: [['scheduled_date', 'ASC']]
      });

      const formatted = appointments.map(app => ({
        id: app.id.toString(),
        clientName: app.customer?.name || 'غير معروف',
        car: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''} - ${app.vehicle?.license_plate || ''}`.trim(),
        issue: app.problem_description,
        time: new Date(app.scheduled_date || app.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA'),
        status: app.status,
        mechanics: app.mechanics && app.mechanics.length > 0 ? app.mechanics : (app.mechanic ? [app.mechanic] : [])
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

      const { status, mechanic_id, mechanic_ids } = req.body;
      
      if (status !== undefined && status !== oldStatus) {
        if (!VALID_STATUSES.includes(status)) {
          await transaction.rollback();
          return res.status(400).json({ message: `Invalid status: ${status}. Valid statuses: ${VALID_STATUSES.join(', ')}` });
        }

        if (oldStatus) {
          if (oldStatus === 'completed' || oldStatus === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot change status of an appointment that is already ${oldStatus}` });
          }
          const allowedNext = ALLOWED_TRANSITIONS[oldStatus] || [];
          if (!allowedNext.includes(status)) {
            await transaction.rollback();
            return res.status(400).json({ message: `Invalid status transition from '${oldStatus}' to '${status}'` });
          }
        }

        appointment.status = status;
      }

      let mechanicAssignmentChanged = false;
      let assignedMechanicIds = [];

      // Handle Multi-Mechanic assignment array
      if (mechanic_ids !== undefined && Array.isArray(mechanic_ids)) {
        // Deduplicate mechanic IDs
        const uniqueMechanicIds = Array.from(new Set(mechanic_ids.map(id => Number(id))));

        // Validate all mechanic IDs
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

        // Clear existing mechanics and bulk insert new assignments
        await AppointmentMechanic.destroy({ where: { appointment_id: appointment.id }, transaction });
        if (uniqueMechanicIds.length > 0) {
          const amRecords = uniqueMechanicIds.map(mId => ({
            appointment_id: appointment.id,
            mechanic_id: mId,
            assigned_at: new Date()
          }));
          await AppointmentMechanic.bulkCreate(amRecords, { transaction });
          appointment.mechanic_id = uniqueMechanicIds[0]; // Legacy fallback sync
          assignedMechanicIds = uniqueMechanicIds;
        } else {
          appointment.mechanic_id = null;
        }
        mechanicAssignmentChanged = true;
      } else if (mechanic_id !== undefined) {
        // Single mechanic update legacy handling
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
          newValues: { status: appointment.status }
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

      await logAudit({
        req,
        action: 'APPOINTMENT_UPDATED',
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValues: { status: oldStatus, mechanic_id: oldMechanicId },
        newValues: { status: appointment.status, mechanic_id: appointment.mechanic_id }
      });
      
      // Fetch updated appointment with mechanics
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

      // Ownership Verification: Client can only view their own appointment
      if (req.user && req.user.role === 'client') {
        if (appointment.client_id !== req.user.id) {
          return res.status(404).json({ message: 'Appointment not found' });
        }
      }

      // Assignment Verification: Mechanic can only view appointments assigned to them
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
          quantity: rp.quantity,
          price: rp.partDetails?.price || 0,
          status: rp.status || 'pending'
        }));
      }

      const formatted = {
        id: appointment.id,
        clientName: appointment.customer?.name || 'غير معروف',
        clientPhone: appointment.customer?.phone || '',
        car: `${appointment.vehicle?.make || ''} ${appointment.vehicle?.model || ''} - ${appointment.vehicle?.license_plate || ''}`.trim(),
        issue: appointment.problem_description,
        time: new Date(appointment.scheduled_date || appointment.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(appointment.scheduled_date || appointment.created_at).toLocaleDateString('ar-SA'),
        status: appointment.status,
        mechanicName: appointment.mechanic?.name || (appointment.mechanics && appointment.mechanics[0]?.name) || 'غير محدد',
        mechanics: appointment.mechanics || [],
        report: appointment.report ? {
          odometer: appointment.report.odometer,
          obd2_codes: appointment.report.obd2_codes,
          visual_notes: appointment.report.visual_notes,
          repair_plan: appointment.report.repair_plan
        } : null,
        requestedParts
      };

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
