'use strict';

const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // GET /api/audit-logs
  getAuditLogs: async (req, res) => {
    try {
      // Access Control Enforcement: Strictly restricted to Super Admin
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'غير مصرح: الوصول لتقارير سجلات التدقيق محصور بـ Super Admin فقط' });
      }

      const {
        actor_user_id,
        action,
        entity_type,
        entity_id,
        from,
        to,
        page = 1,
        limit = 20
      } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const offset = (pageNum - 1) * limitNum;

      const whereClause = {};

      if (actor_user_id) {
        whereClause.actor_user_id = actor_user_id;
      }

      if (action) {
        whereClause.action = { [Op.like]: `%${action}%` };
      }

      if (entity_type) {
        whereClause.entity_type = entity_type;
      }

      if (entity_id) {
        whereClause.entity_id = entity_id;
      }

      if (from || to) {
        whereClause.created_at = {};
        if (from) {
          whereClause.created_at[Op.gte] = new Date(from);
        }
        if (to) {
          // Adjust to end of day if only date is passed
          const toDate = new Date(to);
          if (to.length <= 10) {
            toDate.setHours(23, 59, 59, 999);
          }
          whereClause.created_at[Op.lte] = toDate;
        }
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'actor',
            attributes: ['id', 'name', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset: offset
      });

      const totalPages = Math.ceil(count / limitNum) || 1;

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
