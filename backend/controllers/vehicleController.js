const { Vehicle, Appointment, TechnicalReport, User, Invoice } = require('../models');

module.exports = {
  // GET /api/vehicles
  getAllVehicles: async (req, res) => {
    try {
      const vehicles = await Vehicle.findAll({
        include: [{ model: User, as: 'owner', attributes: ['name'] }]
      });

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        name: `${v.make} ${v.model} ${v.year || ''}`.trim(),
        plateNumber: v.license_plate,
        addedDate: new Date(v.created_at).toLocaleDateString('ar-SA'),
        isActive: true,
        vin: v.vin || '-',
        odometer: '-',
        lastServiceDate: '-',
        image: null
      }));

      res.json(formattedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/vehicles/:id/history
  getVehicleHistory: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByPk(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const appointments = await Appointment.findAll({
        where: { 
          vehicle_id: req.params.id, 
          status: 'completed' 
        },
        include: [
          { model: User, as: 'mechanic', attributes: ['name'] },
          { model: TechnicalReport, as: 'report' },
          { model: Invoice, as: 'invoice', attributes: ['total_amount', 'status'] }
        ],
        order: [['scheduled_date', 'DESC']]
      });

      const history = appointments.map(app => {
        return {
          id: app.id,
          vehicleId: req.params.id,
          title: app.problem_description ? `صيانة - ${app.problem_description}` : 'صيانة دورية',
          serviceType: app.problem_description || 'صيانة دورية',
          year: new Date(app.scheduled_date || app.created_at).getFullYear().toString(),
          date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA'),
          technician: app.mechanic?.name || 'غير محدد',
          cost: app.invoice?.total_amount ? parseFloat(app.invoice.total_amount) : 0,
          status: 'completed',
          statusLabel: 'مكتمل',
          hasInvoice: !!app.invoice,
          partsTitle: 'القطع المرفقة:',
          partsPhotos: [],
          extraPartsCount: 0
        };
      });

      res.json(history);
    } catch (error) {
      console.error('Error fetching vehicle history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/vehicles/my
  getMyVehicles: async (req, res) => {
    try {
      const vehicles = await Vehicle.findAll({
        where: { client_id: req.user.id }
      });

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        plateNumber: v.license_plate,
        vin: v.vin || '',
        addedDate: new Date(v.created_at).toLocaleDateString('ar-SA'),
      }));

      res.json(formattedVehicles);
    } catch (error) {
      console.error('Error fetching my vehicles:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/vehicles
  createVehicle: async (req, res) => {
    try {
      const { make, model, year, license_plate, vin } = req.body;
      const newVehicle = await Vehicle.create({
        client_id: req.user.id,
        make,
        model,
        year,
        license_plate,
        vin
      });
      res.status(201).json(newVehicle);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/vehicles/:id
  updateVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      const { make, model, year, license_plate, vin } = req.body;
      
      const vehicle = await Vehicle.findOne({ where: { id, client_id: req.user.id } });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
      }

      await vehicle.update({ make, model, year, license_plate, vin });
      res.json(vehicle);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
