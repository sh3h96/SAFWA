const { Appointment, User, Vehicle } = require('../models');
const { Op } = require('sequelize');

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
      const { vehicle_id, appointment_date, description } = req.body;
      
      if (!vehicle_id) {
        return res.status(400).json({ message: 'vehicle_id is required' });
      }

      // Ownership Verification: Check if vehicle belongs to current user
      const vehicle = await Vehicle.findOne({
        where: { id: vehicle_id, client_id: req.user.id }
      });

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
      }

      const newAppointment = await Appointment.create({
        client_id: req.user.id,
        vehicle_id,
        scheduled_date: appointment_date || new Date(),
        problem_description: description || 'صيانة عامة',
        status: 'pending'
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
      const { TechnicalReport, RequiredPart, SparePart } = require('../models');
      const appointments = await Appointment.findAll({
        where: { client_id: req.user.id },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
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
      const { TechnicalReport, RequiredPart, SparePart } = require('../models');
      const appointments = await Appointment.findAll({
        where: { mechanic_id: req.user.id },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
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
          { model: User, as: 'customer', attributes: ['name', 'phone'] }
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
        status: app.status
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/appointments/:id
  updateAppointment: async (req, res) => {
    try {
      const appointment = await Appointment.findByPk(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Assignment Verification: Mechanics can only update appointments assigned to them
      if (req.user && req.user.role === 'mechanic') {
        if (appointment.mechanic_id !== req.user.id) {
          return res.status(404).json({ message: 'Appointment not found' });
        }
      }

      const { status, mechanic_id } = req.body;
      
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ message: `Invalid status: ${status}. Valid statuses: ${VALID_STATUSES.join(', ')}` });
        }
        appointment.status = status;
      }

      if (mechanic_id !== undefined) {
        // Mechanics are not allowed to reassign appointments to other mechanics
        if (req.user && req.user.role === 'mechanic' && mechanic_id !== req.user.id) {
          return res.status(400).json({ message: 'Mechanics cannot reassign appointments' });
        }

        if (mechanic_id !== null) {
          const mechanic = await User.findOne({ where: { id: mechanic_id, role: 'mechanic' } });
          if (!mechanic) {
            return res.status(400).json({ message: 'Mechanic not found or invalid role' });
          }
        }
        appointment.mechanic_id = mechanic_id;
      }

      await appointment.save();
      res.json({ message: 'Appointment updated successfully', appointment });
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/appointments/:id
  getAppointmentById: async (req, res) => {
    try {
      const { TechnicalReport, RequiredPart, SparePart } = require('../models');
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: User, as: 'mechanic', attributes: ['name'] },
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
        if (appointment.mechanic_id !== req.user.id) {
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
        mechanicName: appointment.mechanic?.name || 'غير محدد',
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
