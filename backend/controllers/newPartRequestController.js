'use strict';

const { NewPartRequest, TechnicalReport, Appointment, Vehicle, User, SparePart, AppointmentMechanic, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');

/**
 * Normalizes text for matching spare parts and requests
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toString().trim().toLowerCase();
}

/**
 * Helper to search catalog for existing SparePart by part_number or name + brand
 */
async function findMatchingSparePart({ part_number, name, brand, transaction = null }) {
  const normPartNumber = normalizeText(part_number);
  const normName = normalizeText(name);
  const normBrand = normalizeText(brand);

  if (normPartNumber) {
    const matchedByNumber = await SparePart.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('part_number')),
        normPartNumber
      ),
      transaction
    });
    if (matchedByNumber) return matchedByNumber;
  }

  if (normName) {
    const whereConditions = [
      sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), normName)
    ];
    if (normBrand) {
      whereConditions.push(
        sequelize.where(sequelize.fn('LOWER', sequelize.col('brand')), normBrand)
      );
    }

    const matchedByName = await SparePart.findOne({
      where: { [Op.and]: whereConditions },
      transaction
    });
    if (matchedByName) return matchedByName;
  }

  return null;
}

module.exports = {
  // POST /api/new-part-requests
  createRequest: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const {
        technical_report_id,
        name,
        part_number,
        brand,
        description,
        vehicle_compatibility,
        quantity,
        image_url
      } = req.body;

      // 0. Role Check: Client cannot create requests
      if (!req.user || (req.user.role !== 'mechanic' && req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        await transaction.rollback();
        return res.status(403).json({ message: 'غير مصرح لك بتقديم طلبات قطع الغيار الجديدة' });
      }

      // 1. Mandatory Validations
      if (!technical_report_id || isNaN(Number(technical_report_id))) {
        await transaction.rollback();
        return res.status(400).json({ message: 'معرف التقرير الفني مطلوب' });
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        await transaction.rollback();
        return res.status(400).json({ message: 'اسم قطعة الغيار مطلوب' });
      }

      const numQty = Number(quantity);
      if (quantity === undefined || isNaN(numQty) || !Number.isInteger(numQty) || numQty <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'الكمية يجب أن تكون رقماً أكبر من صفر' });
      }

      // 2. Validate TechnicalReport and associated Appointment
      const report = await TechnicalReport.findByPk(technical_report_id, {
        include: [{ model: Appointment, as: 'appointment' }],
        transaction
      });

      if (!report) {
        await transaction.rollback();
        return res.status(404).json({ message: 'التقرير الفني غير موجود' });
      }

      const appointment = report.appointment;
      if (!appointment) {
        await transaction.rollback();
        return res.status(404).json({ message: 'الموعد المرتبط بالتقرير غير موجود' });
      }

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        await transaction.rollback();
        return res.status(400).json({ message: 'لا يمكن تقديم طلب قطعة غيار جديدة لموعد مكتمل أو ملغى' });
      }

      // 3. Authorization Check
      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = appointment.mechanic_id === req.user.id || report.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id },
            transaction
          });
          if (amRecord) isAssigned = true;
        }

        if (!isAssigned) {
          await transaction.rollback();
          return res.status(403).json({ message: 'غير مصرح لك بتقديم طلب قطعة غيار لتقرير غير مسند إليك' });
        }
      }

      // Source of truth for mechanic ID
      const mechanicId = req.user ? req.user.id : (report.mechanic_id || appointment.mechanic_id);

      // 4. Catalog Existence Check (Prevent requesting parts that already exist in SparePart catalog)
      const existingCatalogPart = await findMatchingSparePart({
        part_number,
        name,
        brand,
        transaction
      });

      if (existingCatalogPart) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'القطعة المطلوبة موجودة بالفعل في كتالوج قطع الغيار. يرجى استخدام طلب قطع الغيار العادي.',
          existingSparePart: existingCatalogPart
        });
      }

      // 5. Duplicate Pending Request Check (Same report + same part + status = pending)
      const normPartNumber = normalizeText(part_number);
      const normName = normalizeText(name);

      const pendingRequests = await NewPartRequest.findAll({
        where: {
          technical_report_id,
          status: 'pending'
        },
        transaction
      });

      const duplicatePending = pendingRequests.find(r => {
        if (normPartNumber && normalizeText(r.part_number) === normPartNumber) {
          return true;
        }
        if (normalizeText(r.name) === normName && normalizeText(r.brand) === normalizeText(brand)) {
          return true;
        }
        return false;
      });

      if (duplicatePending) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'يوجد بالفعل طلب معلق لإضافة هذه القطعة لهذا التقرير الفني.',
          existingRequest: duplicatePending
        });
      }

      // 6. Create NewPartRequest
      const newRequest = await NewPartRequest.create({
        technical_report_id,
        mechanic_id: mechanicId,
        name: name.trim(),
        part_number: part_number ? part_number.trim() : null,
        brand: brand ? brand.trim() : null,
        description: description ? description.trim() : null,
        vehicle_compatibility: vehicle_compatibility ? vehicle_compatibility.trim() : null,
        quantity: numQty,
        image_url: image_url || null,
        status: 'pending'
      }, { transaction });

      await transaction.commit();

      await logAudit({
        req,
        action: 'NEW_PART_REQUEST_CREATED',
        entityType: 'NewPartRequest',
        entityId: newRequest.id,
        newValues: {
          technical_report_id,
          mechanic_id: mechanicId,
          name: newRequest.name,
          quantity: newRequest.quantity
        }
      });

      const createdRequest = await NewPartRequest.findByPk(newRequest.id, {
        include: [
          { model: TechnicalReport, as: 'technicalReport' },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone'] }
        ]
      });

      res.status(201).json({
        message: 'تم إرسال طلب قطعة الغيار الجديدة بنجاح',
        request: createdRequest
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating new part request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/new-part-requests
  getAllRequests: async (req, res) => {
    try {
      const { status, page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      if (req.user && req.user.role === 'mechanic') {
        whereClause.mechanic_id = req.user.id;
      }

      const { count, rows } = await NewPartRequest.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: TechnicalReport,
            as: 'technicalReport',
            include: [
              {
                model: Appointment,
                as: 'appointment',
                include: [
                  { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'year'] },
                  { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] }
                ]
              }
            ]
          },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone'] },
          { model: SparePart, as: 'createdSparePart' }
        ],
        offset,
        limit,
        order: [['created_at', 'DESC']]
      });

      res.json({
        requests: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pageSize: limit
        }
      });
    } catch (error) {
      console.error('Error fetching new part requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/new-part-requests/:id
  getRequestById: async (req, res) => {
    try {
      const request = await NewPartRequest.findByPk(req.params.id, {
        include: [
          {
            model: TechnicalReport,
            as: 'technicalReport',
            include: [
              {
                model: Appointment,
                as: 'appointment',
                include: [
                  { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'year'] },
                  { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] }
                ]
              }
            ]
          },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone'] },
          { model: SparePart, as: 'createdSparePart' }
        ]
      });

      if (!request) {
        return res.status(404).json({ message: 'طلب قطعة الغيار غير موجود' });
      }

      // Authorization Check
      if (req.user && req.user.role === 'mechanic') {
        if (request.mechanic_id !== req.user.id && request.technicalReport?.appointment?.mechanic_id !== req.user.id) {
          return res.status(404).json({ message: 'طلب قطعة الغيار غير موجود' });
        }
      }

      if (req.user && req.user.role === 'client') {
        if (request.technicalReport?.appointment?.client_id !== req.user.id) {
          return res.status(404).json({ message: 'طلب قطعة الغيار غير موجود' });
        }
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching new part request details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/new-part-requests/:id/approval (or POST /api/new-part-requests/:id/approve)
  approveRequest: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      // 1. Authorization: Admin or Super Admin only
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        await transaction.rollback();
        return res.status(403).json({ message: 'غير مصرح لك باعتماد طلبات قطع الغيار الجديدة' });
      }

      // 2. Lock Row for Concurrency Protection
      const request = await NewPartRequest.findByPk(req.params.id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!request) {
        await transaction.rollback();
        return res.status(404).json({ message: 'طلب قطعة الغيار غير موجود' });
      }

      // 3. Status check
      if (request.status === 'approved') {
        await transaction.rollback();
        return res.status(409).json({ message: 'تم اعتماد هذا الطلب سابقاً' });
      }

      if (request.status === 'rejected') {
        await transaction.rollback();
        return res.status(409).json({ message: 'لا يمكن اعتماد طلب مرفوض سابقاً' });
      }

      if (request.status !== 'pending') {
        await transaction.rollback();
        return res.status(409).json({ message: `الطلب في حالة (${request.status}) ولا يمكن اعتماده` });
      }

      // 4. Catalog Race Condition Check inside Transaction
      let createdSparePart = await findMatchingSparePart({
        part_number: request.part_number,
        name: request.name,
        brand: request.brand,
        transaction
      });

      if (!createdSparePart) {
        const catalogPrice = req.body.price !== undefined ? parseFloat(req.body.price) : 0;

        createdSparePart = await SparePart.create({
          name: request.name,
          part_number: request.part_number,
          brand: request.brand,
          price: catalogPrice,
          stock_quantity: 0, // STRICTLY 0 as per Phase 4 non-procurement boundary rule!
          min_stock_level: 5,
          image_url: request.image_url
        }, { transaction });
      }

      // 5. Update NewPartRequest state
      request.status = 'approved';
      request.created_spare_part_id = createdSparePart.id;
      await request.save({ transaction });

      await transaction.commit();

      await logAudit({
        req,
        action: 'NEW_PART_REQUEST_APPROVED',
        entityType: 'NewPartRequest',
        entityId: request.id,
        newValues: {
          status: 'approved',
          created_spare_part_id: createdSparePart.id
        }
      });

      const updatedRequest = await NewPartRequest.findByPk(request.id, {
        include: [
          { model: TechnicalReport, as: 'technicalReport' },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone'] },
          { model: SparePart, as: 'createdSparePart' }
        ]
      });

      res.json({
        message: 'تم اعتماد قطعة الغيار وإضافتها لكتالوج قطع الغيار بنجاح (المخزون الأولي: 0)',
        request: updatedRequest
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error approving new part request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/new-part-requests/:id/rejection (or POST /api/new-part-requests/:id/reject)
  rejectRequest: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      // 1. Authorization: Admin or Super Admin only
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        await transaction.rollback();
        return res.status(403).json({ message: 'غير مصرح لك برفض طلبات قطع الغيار الجديدة' });
      }

      const { rejection_reason } = req.body;

      if (!rejection_reason || typeof rejection_reason !== 'string' || !rejection_reason.trim()) {
        await transaction.rollback();
        return res.status(400).json({ message: 'سبب الرفض مطلوب ولا يمكن أن يكون فارغاً' });
      }

      // 2. Lock Row for Concurrency Protection
      const request = await NewPartRequest.findByPk(req.params.id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!request) {
        await transaction.rollback();
        return res.status(404).json({ message: 'طلب قطعة الغيار غير موجود' });
      }

      // 3. Status check
      if (request.status === 'approved') {
        await transaction.rollback();
        return res.status(409).json({ message: 'لا يمكن رفض طلب تم اعتماده سابقاً' });
      }

      if (request.status === 'rejected') {
        await transaction.rollback();
        return res.status(409).json({ message: 'تم رفض هذا الطلب سابقاً' });
      }

      if (request.status !== 'pending') {
        await transaction.rollback();
        return res.status(409).json({ message: `الطلب في حالة (${request.status}) ولا يمكن رفضه` });
      }

      // 4. Update NewPartRequest state
      request.status = 'rejected';
      request.rejection_reason = rejection_reason.trim();
      await request.save({ transaction });

      await transaction.commit();

      await logAudit({
        req,
        action: 'NEW_PART_REQUEST_REJECTED',
        entityType: 'NewPartRequest',
        entityId: request.id,
        newValues: {
          status: 'rejected',
          rejection_reason: request.rejection_reason
        }
      });

      const updatedRequest = await NewPartRequest.findByPk(request.id, {
        include: [
          { model: TechnicalReport, as: 'technicalReport' },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'email', 'phone'] }
        ]
      });

      res.json({
        message: 'تم رفض طلب قطعة الغيار بنجاح',
        request: updatedRequest
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error rejecting new part request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
