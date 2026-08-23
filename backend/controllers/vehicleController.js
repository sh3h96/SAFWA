const { Vehicle, Appointment, TechnicalReport, User, WalkInCustomer, VehiclePlateHistory, Invoice, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');
const customerVehicleAssociationService = require('../services/customerVehicleAssociationService');
const vehicleMatchingService = require('../services/vehicleMatchingService');

module.exports = {
  // GET /api/vehicles
  getAllVehicles: async (req, res) => {
    try {
      const {
        search,
        page,
        limit,
        sortBy = 'created_at',
        sortOrder = 'desc',
        make,
        model,
        year,
        client_id
      } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
      const offset = (pageNum - 1) * limitNum;

      const allowedSortColumns = ['created_at', 'make', 'model', 'year', 'license_plate', 'id'];
      const targetSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const targetSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const whereClause = {};

      if (make) whereClause.make = make;
      if (model) whereClause.model = model;
      if (year) whereClause.year = year;
      if (client_id) whereClause.client_id = client_id;

      if (search && search.trim() !== '') {
        const searchTerm = search.trim();
        whereClause[Op.or] = [
          { make: { [Op.like]: `%${searchTerm}%` } },
          { model: { [Op.like]: `%${searchTerm}%` } },
          { license_plate: { [Op.like]: `%${searchTerm}%` } },
          { vin: { [Op.like]: `%${searchTerm}%` } },
          { '$owner.name$': { [Op.like]: `%${searchTerm}%` } },
          { '$owner.email$': { [Op.like]: `%${searchTerm}%` } },
          { '$owner.phone$': { [Op.like]: `%${searchTerm}%` } }
        ];
      }

      const { count, rows: vehicles } = await Vehicle.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'associatedUsers',
            attributes: ['id', 'name', 'email', 'phone'],
            through: { attributes: [] }
          },
          {
            model: WalkInCustomer,
            as: 'associatedWalkInCustomers',
            attributes: ['id', 'name', 'phone'],
            through: { attributes: [] }
          }
        ],
        order: [[targetSortBy, targetSortOrder]],
        limit: limitNum,
        offset: offset,
        subQuery: false,
        distinct: true
      });

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        client_id: v.client_id,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || null,
        transmission: v.transmission || null,
        fuel_type: v.fuel_type || null,
        license_plate: v.license_plate,
        name: `${v.make} ${v.model} ${v.year || ''}`.trim(),
        plateNumber: v.license_plate,
        addedDate: v.created_at,
        isActive: true,
        vin: v.vin || '-',
        image_url: v.image_url || null,
        owner: v.owner ? {
          id: v.owner.id,
          name: v.owner.name,
          email: v.owner.email,
          phone: v.owner.phone
        } : null,
        associatedUsers: v.associatedUsers || [],
        associatedWalkInCustomers: v.associatedWalkInCustomers || []
      }));

      const totalPages = Math.ceil(count / limitNum) || 1;

      res.json({
        data: formattedVehicles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/vehicles/:id
  getVehicleById: async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await Vehicle.findByPk(id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone', 'role', 'status']
          },
          {
            model: User,
            as: 'associatedUsers',
            attributes: ['id', 'name', 'email', 'phone', 'role', 'status'],
            through: { attributes: [] }
          },
          {
            model: WalkInCustomer,
            as: 'associatedWalkInCustomers',
            attributes: ['id', 'name', 'phone', 'notes'],
            through: { attributes: [] }
          },
          {
            model: VehiclePlateHistory,
            as: 'plateHistory',
            attributes: ['id', 'license_plate', 'start_date', 'end_date', 'is_active', 'change_reason']
          },
          {
            model: Appointment,
            as: 'appointments',
            include: [
              { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
              { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone', 'role'] },
              { model: User, as: 'mechanics', attributes: ['id', 'name', 'email', 'phone', 'role'], through: { attributes: [] } },
              { model: TechnicalReport, as: 'report' },
              { model: Invoice, as: 'invoice', attributes: ['total_amount', 'status'] }
            ]
          }
        ]
      });

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      if (req.user.role === 'client' && vehicle.client_id !== req.user.id) {
        // Check if associated via VehicleUser
        const isAssociated = vehicle.associatedUsers && vehicle.associatedUsers.some(u => u.id === req.user.id);
        if (!isAssociated) {
          return res.status(403).json({ message: 'Access forbidden: Not your vehicle' });
        }
      }

      const statusMap = {
        pending: 'قيد الانتظار',
        awaiting_assignment: 'بانتظار التعيين',
        in_progress: 'قيد التنفيذ',
        under_inspection: 'قيد الفحص',
        ready_for_pickup: 'جاهزة للاستلام',
        completed: 'مكتملة',
        cancelled: 'ملغاة',
        canceled: 'ملغاة'
      };

      // Sort plate history DESC
      const sortedPlateHistory = (vehicle.plateHistory || []).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

      res.json({
        id: vehicle.id,
        client_id: vehicle.client_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || null,
        transmission: vehicle.transmission || null,
        fuel_type: vehicle.fuel_type || null,
        license_plate: vehicle.license_plate,
        vin: vehicle.vin || null,
        image_url: vehicle.image_url || null,
        name: `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}`.trim(),
        plateNumber: vehicle.license_plate,
        addedDate: vehicle.created_at,
        created_at: vehicle.created_at,
        updated_at: vehicle.updated_at,
        owner: vehicle.owner ? {
          id: vehicle.owner.id,
          name: vehicle.owner.name,
          email: vehicle.owner.email,
          phone: vehicle.owner.phone,
          role: vehicle.owner.role,
          status: vehicle.owner.status
        } : null,
        associatedUsers: vehicle.associatedUsers || [],
        associatedWalkInCustomers: vehicle.associatedWalkInCustomers || [],
        plateHistory: sortedPlateHistory,
        appointments: (vehicle.appointments || []).map(app => {
          const assignedMechanics = (app.mechanics && app.mechanics.length > 0)
            ? app.mechanics.map(m => ({ id: m.id, name: m.name, role: m.role || 'mechanic' }))
            : (app.mechanic ? [{ id: app.mechanic.id, name: app.mechanic.name, role: app.mechanic.role || 'mechanic' }] : []);

          return {
            id: app.id,
            serviceType: app.problem_description || 'صيانة دورية',
            date: app.scheduled_date || app.created_at,
            technician: assignedMechanics.map(m => m.name).join('، ') || 'غير محدد',
            technician_id: assignedMechanics.length > 0 ? assignedMechanics[0].id : null,
            mechanics: assignedMechanics,
            cost: app.invoice?.total_amount ? parseFloat(app.invoice.total_amount) : 0,
            status: app.status,
            statusLabel: statusMap[app.status] || app.status || 'غير محدد',
            client: app.customer ? { id: app.customer.id, name: app.customer.name, phone: app.customer.phone } : null
          };
        })
      });
    } catch (error) {
      console.error('Error fetching vehicle by id:', error);
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

      if (req.user.role === 'client' && vehicle.client_id !== req.user.id) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const appointments = await Appointment.findAll({
        where: { vehicle_id: req.params.id },
        include: [
          { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'email'] },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone', 'email', 'role'] },
          { model: User, as: 'mechanics', attributes: ['id', 'name', 'phone', 'email', 'role'], through: { attributes: [] } },
          { model: TechnicalReport, as: 'report' },
          { model: Invoice, as: 'invoice', attributes: ['total_amount', 'status'] }
        ],
        order: [['scheduled_date', 'DESC']]
      });

      const statusMap = {
        pending: 'قيد الانتظار',
        awaiting_assignment: 'بانتظار التعيين',
        in_progress: 'قيد التنفيذ',
        under_inspection: 'قيد الفحص',
        ready_for_pickup: 'جاهزة للاستلام',
        completed: 'مكتملة',
        cancelled: 'ملغاة',
        canceled: 'ملغاة'
      };

      const history = appointments.map(app => {
        const assignedMechanics = (app.mechanics && app.mechanics.length > 0)
          ? app.mechanics.map(m => ({ id: m.id, name: m.name, role: m.role || 'mechanic' }))
          : (app.mechanic ? [{ id: app.mechanic.id, name: app.mechanic.name, role: app.mechanic.role || 'mechanic' }] : []);

        return {
          id: app.id,
          vehicleId: req.params.id,
          title: app.problem_description ? `صيانة - ${app.problem_description}` : 'صيانة دورية',
          serviceType: app.problem_description || 'صيانة دورية',
          year: new Date(app.scheduled_date || app.created_at).getFullYear().toString(),
          date: app.scheduled_date || app.created_at,
          technician: assignedMechanics.map(m => m.name).join('، ') || 'غير محدد',
          technician_id: assignedMechanics.length > 0 ? assignedMechanics[0].id : null,
          mechanics: assignedMechanics,
          cost: app.invoice?.total_amount ? parseFloat(app.invoice.total_amount) : 0,
          status: app.status || 'completed',
          statusLabel: statusMap[app.status] || app.status || 'غير محدد',
          hasInvoice: !!app.invoice,
          client: app.client ? { id: app.client.id, name: app.client.name, phone: app.client.phone } : null
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
        include: [
          {
            model: User,
            as: 'associatedUsers',
            where: { id: req.user.id },
            required: false
          }
        ],
        where: {
          [Op.or]: [
            { client_id: req.user.id },
            { '$associatedUsers.id$': req.user.id }
          ]
        }
      });

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || null,
        transmission: v.transmission || null,
        fuel_type: v.fuel_type || null,
        plateNumber: v.license_plate,
        vin: v.vin || '',
        image_url: v.image_url || null,
        addedDate: v.created_at
      }));

      res.json(formattedVehicles);
    } catch (error) {
      console.error('Error fetching my vehicles:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/vehicles
  createVehicle: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { make, model, year, license_plate, vin, color, transmission, fuel_type, client_id, bypass_match_check } = req.body;

      if (!make || !model || !license_plate) {
        await transaction.rollback();
        return res.status(400).json({ message: 'الشركة المصنعة (make)، الموديل (model)، ورقم اللوحة (license_plate) متطلبات أساسية لإنشاء المركبة.' });
      }

      let targetClientId = req.user.id;
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        if (client_id !== undefined && client_id !== null) {
          const targetClient = await User.findByPk(client_id, { transaction });
          if (!targetClient) {
            await transaction.rollback();
            return res.status(400).json({ message: 'المستخدم المستهدف غير موجود' });
          }
          targetClientId = client_id;
        }
      }

      const normalizedPlate = vehicleMatchingService.normalizePlate(license_plate);
      const normalizedVin = vin ? vehicleMatchingService.normalizeVin(vin) : null;

      // Check candidate matches unless bypassed
      if (!bypass_match_check) {
        const matchResult = await vehicleMatchingService.findPotentialVehicleMatch({
          vin: normalizedVin,
          license_plate: normalizedPlate,
          make,
          model,
          year
        });

        if (matchResult.hasConflict) {
          await transaction.rollback();
          return res.status(409).json({
            message: matchResult.message,
            conflictType: matchResult.conflictType,
            candidateVehicle: matchResult.candidateVehicle,
            requiresVehicleResolution: true
          });
        }

        if (matchResult.hasMatch && matchResult.vehicle) {
          // Re-use existing vehicle and associate target client
          await customerVehicleAssociationService.associateUser({
            vehicleId: matchResult.vehicle.id,
            userId: targetClientId,
            transaction
          });

          // Handle plate update if VIN matched but plate changed
          if (matchResult.isPlateUpdate) {
            await vehicleMatchingService.updateVehiclePlateTimeline({
              vehicleId: matchResult.vehicle.id,
              newPlate: normalizedPlate,
              reason: 'PLATE_UPDATE',
              transaction
            });
          }

          await transaction.commit();

          const refreshedVehicle = await Vehicle.findByPk(matchResult.vehicle.id);
          return res.status(200).json(refreshedVehicle);
        }
      }

      // Create new Vehicle record
      const newVehicle = await Vehicle.create({
        client_id: targetClientId,
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        license_plate: normalizedPlate,
        vin: normalizedVin,
        color: color ? color.trim() : null,
        transmission: transmission ? transmission.trim() : null,
        fuel_type: fuel_type ? fuel_type.trim() : null
      }, { transaction });

      // Create initial plate history
      await VehiclePlateHistory.create({
        vehicle_id: newVehicle.id,
        license_plate: normalizedPlate,
        start_date: new Date(),
        is_active: true,
        change_reason: 'INITIAL_REGISTRATION'
      }, { transaction });

      // Associate client in vehicle_users
      await customerVehicleAssociationService.associateUser({
        vehicleId: newVehicle.id,
        userId: targetClientId,
        transaction
      });

      await transaction.commit();

      await logAudit({
        req,
        action: 'VEHICLE_CREATED',
        entityType: 'Vehicle',
        entityId: newVehicle.id,
        newValues: { client_id: targetClientId, make, model, year, license_plate: normalizedPlate, vin: normalizedVin }
      });

      res.status(201).json(newVehicle);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      console.error('Error creating vehicle:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ message: error.message || 'Server error' });
    }
  },

  // PUT /api/vehicles/:id
  updateVehicle: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { make, model, year, license_plate, vin, color, transmission, fuel_type, image_url } = req.body;

      const whereClause = { id };
      if (req.user.role === 'client') {
        // Client can edit if they are owner or associated
        whereClause.client_id = req.user.id;
      }

      const vehicle = await Vehicle.findByPk(id, { transaction });
      if (!vehicle) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const oldValues = {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        license_plate: vehicle.license_plate,
        vin: vehicle.vin,
        color: vehicle.color,
        transmission: vehicle.transmission,
        fuel_type: vehicle.fuel_type,
        image_url: vehicle.image_url
      };

      const normalizedVin = vin !== undefined ? (vin ? vehicleMatchingService.normalizeVin(vin) : null) : vehicle.vin;
      const normalizedPlate = license_plate !== undefined ? vehicleMatchingService.normalizePlate(license_plate) : vehicle.license_plate;

      // Handle license plate change in vehicle_plate_history
      if (license_plate !== undefined && normalizedPlate && normalizedPlate !== vehicle.license_plate) {
        await vehicleMatchingService.updateVehiclePlateTimeline({
          vehicleId: vehicle.id,
          newPlate: normalizedPlate,
          reason: 'PLATE_UPDATE',
          transaction
        });
      }

      // Update fields in-place on the same Vehicle entity
      const updateData = {};
      if (make !== undefined) updateData.make = make.trim();
      if (model !== undefined) updateData.model = model.trim();
      if (year !== undefined) updateData.year = year ? parseInt(year, 10) : null;
      if (normalizedPlate !== undefined) updateData.license_plate = normalizedPlate;
      if (normalizedVin !== undefined) updateData.vin = normalizedVin;
      if (color !== undefined) updateData.color = color ? color.trim() : null;
      if (transmission !== undefined) updateData.transmission = transmission ? transmission.trim() : null;
      if (fuel_type !== undefined) updateData.fuel_type = fuel_type ? fuel_type.trim() : null;
      if (image_url !== undefined) updateData.image_url = image_url;

      await vehicle.update(updateData, { transaction });
      await transaction.commit();

      await logAudit({
        req,
        action: 'VEHICLE_UPDATED',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        oldValues,
        newValues: updateData
      });

      const refreshed = await Vehicle.findByPk(id, {
        include: [
          { model: VehiclePlateHistory, as: 'plateHistory' },
          { model: User, as: 'associatedUsers', attributes: ['id', 'name', 'email', 'phone'], through: { attributes: [] } },
          { model: WalkInCustomer, as: 'associatedWalkInCustomers', attributes: ['id', 'name', 'phone'], through: { attributes: [] } }
        ]
      });

      res.json(refreshed);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      console.error('Error updating vehicle:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ message: error.message || 'Server error' });
    }
  },

  // DELETE /api/vehicles/:id
  deleteVehicle: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        await transaction.rollback();
        return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
      }

      const vehicle = await Vehicle.findByPk(id, { transaction });
      if (!vehicle) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      const appointmentCount = await Appointment.count({
        where: { vehicle_id: id },
        transaction
      });

      if (appointmentCount > 0) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'لا يمكن حذف المركبة لاحتوائها على سجلات صيانة ومواعيد تاريخية مرتبطة بها'
        });
      }

      const snapshot = {
        id: vehicle.id,
        client_id: vehicle.client_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        license_plate: vehicle.license_plate,
        vin: vehicle.vin
      };

      await vehicle.destroy({ transaction });
      await transaction.commit();

      await logAudit({
        req,
        action: 'VEHICLE_DELETED',
        entityType: 'Vehicle',
        entityId: snapshot.id,
        oldValues: snapshot
      });

      res.json({ message: 'تم حذف المركبة بنجاح' });
    } catch (error) {
      await transaction.rollback().catch(() => {});
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
