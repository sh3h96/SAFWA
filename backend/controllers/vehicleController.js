const { Vehicle, Appointment, TechnicalReport, User, Invoice } = require('../models');

module.exports = {
  // GET /api/vehicles
  getAllVehicles: async (req, res) => {
    try {
      const vehicles = await Vehicle.findAll({
        include: [{ model: User, as: 'owner', attributes: ['name'] }] // requires model association
      });

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        name: `${v.make} ${v.model} ${v.year}`,
        plateNumber: v.license_plate,
        addedDate: new Date(v.created_at).toLocaleDateString('ar-SA'),
        isActive: true, // Needs logic based on active technical reports
        vin: v.vin || '-',
        odometer: '-', // Would come from last inspection
        lastServiceDate: '-', // Would come from last completed appointment
        image: null
      }));

      // Fallback for empty DB
      if (formattedVehicles.length === 0) {
        return res.json([
          {
            id: 'veh_1',
            name: 'تويوتا كامري 2024 (لا يوجد بيانات)',
            plateNumber: 'KSA 4432',
            addedDate: '02/01/2024',
            isActive: true,
            vin: '4T1BF1FK0NU623451',
            odometer: '85,000 كم',
            lastServiceDate: '12 أبريل',
            image: null
          }
        ]);
      }

      res.json(formattedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/vehicles/:id/history
  getVehicleHistory: async (req, res) => {
    try {
      const reports = await TechnicalReport.findAll({
        where: { vehicle_id: req.params.id, status: 'completed' },
        include: [
          { model: User, as: 'technician', attributes: ['name'] }
        ],
        order: [['created_at', 'DESC']]
      });

      const history = reports.map(r => ({
        id: r.id,
        vehicleId: req.params.id,
        title: `صيانة ${r.repair_type}`,
        serviceType: r.repair_type,
        year: new Date(r.created_at).getFullYear().toString(),
        date: new Date(r.created_at).toLocaleDateString('ar-SA'),
        technician: r.technician ? r.technician.name : 'غير محدد',
        cost: 0, // Would link to invoice
        status: 'completed',
        statusLabel: 'مكتمل',
        hasInvoice: true,
        partsTitle: 'القطع المرفقة:',
        partsPhotos: [],
        extraPartsCount: 0
      }));

      // Fallback for empty DB
      if (history.length === 0) {
        return res.json([
          {
            id: 'node_1',
            vehicleId: req.params.id,
            title: 'صيانة 80,000 كم (وهمي)',
            serviceType: 'صيانة دورية',
            year: '2026',
            date: '12 أبريل 2026',
            technician: 'م. محمد علي',
            cost: 650,
            status: 'completed',
            statusLabel: 'مكتمل',
            hasInvoice: true
          }
        ]);
      }

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
