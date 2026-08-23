'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize, User, Vehicle, SparePart, NewPartRequest } = require('../models');
const { logAudit } = require('../utils/auditLogger');
const { FOLDER_MAP } = require('../middleware/uploadMiddleware');

const ALLOWED_ENTITY_TYPES = ['user', 'vehicle', 'spare-part', 'part', 'new-part-request'];

/**
 * Safely unlinks a file from disk if it exists
 */
function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting file:', filePath, err.message);
  }
}

/**
 * Helper to resolve entity, model field name, model display name, and verify RBAC
 */
async function resolveEntityAndAuthorize(req, rawEntityType, entityId) {
  const normalizedType = (rawEntityType || '').toLowerCase().replace(/_/g, '-');
  const entityType = normalizedType === 'part' ? 'spare-part' : normalizedType;

  if (!ALLOWED_ENTITY_TYPES.includes(rawEntityType) && !ALLOWED_ENTITY_TYPES.includes(entityType) && !ALLOWED_ENTITY_TYPES.includes(normalizedType)) {
    return { errorStatus: 400, errorMessage: 'نوع الكيان غير مدعوم' };
  }

  const id = Number(entityId);
  if (!id || isNaN(id) || id <= 0) {
    return { errorStatus: 400, errorMessage: 'معرف الكيان غير صالح' };
  }

  const role = req.user.role;
  const userId = Number(req.user.id);

  let entity = null;
  let fieldName = 'image_url';
  let modelName = '';

  if (entityType === 'user') {
    fieldName = 'avatar_url';
    modelName = 'User';
    entity = await User.findByPk(id);
    if (!entity) {
      return { errorStatus: 404, errorMessage: 'المستخدم غير موجود' };
    }

    // RBAC: Self or Admin/Super Admin
    const isSelf = userId === id;
    const isAdmin = ['admin', 'super_admin'].includes(role);
    if (!isSelf && !isAdmin) {
      return { errorStatus: 403, errorMessage: 'غير مصرح لك بتعديل الصورة الشخصية لهذا المستخدم' };
    }
  } else if (entityType === 'vehicle') {
    fieldName = 'image_url';
    modelName = 'Vehicle';
    entity = await Vehicle.findByPk(id);
    if (!entity) {
      return { errorStatus: 404, errorMessage: 'المركبة غير موجودة' };
    }

    // RBAC: Vehicle owner client or Admin/Super Admin
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const isOwnerClient = role === 'client' && Number(entity.client_id) === userId;
    if (!isAdmin && !isOwnerClient) {
      return { errorStatus: 403, errorMessage: 'غير مصرح لك بتعديل صورة هذه المركبة' };
    }
  } else if (entityType === 'spare-part') {
    fieldName = 'image_url';
    modelName = 'SparePart';
    entity = await SparePart.findByPk(id);
    if (!entity) {
      return { errorStatus: 404, errorMessage: 'قطعة الغيار غير موجودة' };
    }

    // RBAC: Admin/Super Admin only
    const isAdmin = ['admin', 'super_admin'].includes(role);
    if (!isAdmin) {
      return { errorStatus: 403, errorMessage: 'غير مصرح لك بتعديل صور قطع الغيار' };
    }
  } else if (entityType === 'new-part-request') {
    fieldName = 'image_url';
    modelName = 'NewPartRequest';
    entity = await NewPartRequest.findByPk(id);
    if (!entity) {
      return { errorStatus: 404, errorMessage: 'طلب قطعة الغيار غير موجود' };
    }

    // RBAC: Creator mechanic or Admin/Super Admin
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const isCreatorMechanic = role === 'mechanic' && Number(entity.mechanic_id) === userId;
    if (!isAdmin && !isCreatorMechanic) {
      return { errorStatus: 403, errorMessage: 'غير مصرح لك بتعديل صورة طلب قطعة الغيار' };
    }
  }

  return { entity, fieldName, modelName };
}

/**
 * POST /api/uploads/image
 * Accepts single file (req.file) + entityType + entityId
 */
exports.uploadImage = async (req, res) => {
  const entityType = (req.body.entityType || '').trim();
  const entityId = req.body.entityId;

  // Resolve entity & check permissions
  const authRes = await resolveEntityAndAuthorize(req, entityType, entityId);
  if (authRes.errorStatus) {
    safeUnlink(req.file ? req.file.path : null);
    return res.status(authRes.errorStatus).json({ message: authRes.errorMessage });
  }

  const { entity, fieldName, modelName } = authRes;
  const folder = FOLDER_MAP[entityType];
  const relativeUrl = `/uploads/${folder}/${req.file.filename}`;
  const oldImageUrl = entity[fieldName];

  const t = await sequelize.transaction();
  try {
    await entity.update({ [fieldName]: relativeUrl }, { transaction: t });

    await logAudit({
      req,
      action: oldImageUrl ? 'IMAGE_REPLACED' : 'IMAGE_UPLOADED',
      entityType: modelName,
      entityId: entity.id,
      oldValues: { [fieldName]: oldImageUrl },
      newValues: { [fieldName]: relativeUrl },
      transaction: t
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    safeUnlink(req.file ? req.file.path : null);
    console.error('Database update failed during image upload:', err);
    return res.status(500).json({ message: 'فشل حفظ بيانات الصورة في قاعدة البيانات' });
  }

  // Database commit succeeded -> safely remove old physical file if it exists
  if (oldImageUrl && typeof oldImageUrl === 'string' && oldImageUrl.startsWith('/uploads/')) {
    const oldDiskPath = path.join(__dirname, '..', oldImageUrl);
    safeUnlink(oldDiskPath);
  }

  return res.status(200).json({
    success: true,
    message: oldImageUrl ? 'تم تحديث الصورة بنجاح.' : 'تم رفع الصورة بنجاح.',
    image_url: relativeUrl,
    imageUrl: relativeUrl
  });
};

/**
 * DELETE /api/uploads/image
 * Body or query params: { entityType, entityId }
 */
exports.deleteImage = async (req, res) => {
  const entityType = (req.body.entityType || req.query.entityType || '').trim();
  const entityId = req.body.entityId || req.query.entityId;

  const authRes = await resolveEntityAndAuthorize(req, entityType, entityId);
  if (authRes.errorStatus) {
    return res.status(authRes.errorStatus).json({ message: authRes.errorMessage });
  }

  const { entity, fieldName, modelName } = authRes;
  const oldImageUrl = entity[fieldName];

  if (!oldImageUrl) {
    return res.status(400).json({ message: 'لا توجد صورة مرتبطة بهذا الكيان' });
  }

  const t = await sequelize.transaction();
  try {
    await entity.update({ [fieldName]: null }, { transaction: t });

    await logAudit({
      req,
      action: 'IMAGE_DELETED',
      entityType: modelName,
      entityId: entity.id,
      oldValues: { [fieldName]: oldImageUrl },
      newValues: { [fieldName]: null },
      transaction: t
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error('Database update failed during image deletion:', err);
    return res.status(500).json({ message: 'فشل حذف بيانات الصورة من قاعدة البيانات' });
  }

  // Database commit succeeded -> safely remove physical file
  if (typeof oldImageUrl === 'string' && oldImageUrl.startsWith('/uploads/')) {
    const oldDiskPath = path.join(__dirname, '..', oldImageUrl);
    safeUnlink(oldDiskPath);
  }

  return res.status(200).json({
    success: true,
    message: 'تم حذف الصورة بنجاح.'
  });
};
