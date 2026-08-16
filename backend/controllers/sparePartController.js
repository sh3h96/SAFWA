const { SparePart } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');

module.exports = {
  // GET /api/inventory (GET /api/spare-parts)
  getAllParts: async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search } = req.query;
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      let whereClause = {};
      if (search) {
        whereClause = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { part_number: { [Op.like]: `%${search}%` } },
            { brand: { [Op.like]: `%${search}%` } }
          ]
        };
      }

      const { count, rows } = await SparePart.findAndCountAll({
        where: whereClause,
        offset,
        limit,
        order: [['name', 'ASC']]
      });

      const items = rows.map(part => {
        const stockQty = part.stock_quantity !== null && part.stock_quantity !== undefined ? part.stock_quantity : 0;
        const minStock = part.min_stock_level !== null && part.min_stock_level !== undefined ? part.min_stock_level : 5;
        
        let status = 'good';
        let categoryVariant = 'success';
        
        if (stockQty <= minStock) {
          status = 'low';
          categoryVariant = 'danger';
        } else if (stockQty <= minStock + 5) {
          status = 'medium';
          categoryVariant = 'warning';
        }

        return {
          id: part.id,
          name: part.name,
          sku: part.part_number || '-',
          category: 'قطع غيار',
          categoryVariant,
          manufacturer: part.brand || 'غير محدد',
          stock: stockQty,
          minStock,
          createdAt: part.created_at || part.createdAt,
          status,
          purchasePrice: parseFloat(part.price || 0),
          salePrice: parseFloat(part.price || 0) * 1.2,
          supplier: 'مورد معتمد',
          image: null
        };
      });

      const lowStockCount = await SparePart.count({
        where: { stock_quantity: { [Op.lte]: SparePart.sequelize.col('min_stock_level') } }
      });

      const inventory = {
        items,
        pagination: { 
          total: count, 
          page: parseInt(page), 
          pageSize: limit, 
          currentStart: count > 0 ? offset + 1 : 0, 
          currentEnd: Math.min(offset + limit, count) 
        },
        filters: { manufacturers: ['الكل'] },
        lowStockAlert: { count: lowStockCount, message: `تنبيه: ${lowStockCount} قطع وصلت إلى حد الطلب الأدنى` }
      };

      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/inventory (POST /api/spare-parts)
  addPart: async (req, res) => {
    try {
      const { name, part_number, brand, price, stock_quantity, min_stock_level } = req.body;
      
      if (!name || price === undefined) {
        return res.status(400).json({ message: 'Name and price are required' });
      }

      const newPart = await SparePart.create({
        name, 
        part_number, 
        brand, 
        price: parseFloat(price), 
        stock_quantity: stock_quantity !== undefined ? parseInt(stock_quantity) : 0, 
        min_stock_level: min_stock_level !== undefined ? parseInt(min_stock_level) : 5
      });

      await logAudit({
        req,
        action: 'PART_CREATED',
        entityType: 'SparePart',
        entityId: newPart.id,
        newValues: { name, part_number, brand, price: newPart.price, stock_quantity: newPart.stock_quantity }
      });

      res.status(201).json({ message: 'Part added successfully', part: newPart });
    } catch (error) {
      console.error('Error adding part:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/inventory/:id (PUT /api/spare-parts/:id)
  updatePart: async (req, res) => {
    try {
      const part = await SparePart.findByPk(req.params.id);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      
      const oldValues = {
        name: part.name,
        part_number: part.part_number,
        brand: part.brand,
        stock_quantity: part.stock_quantity,
        price: part.price,
        min_stock_level: part.min_stock_level
      };

      const { name, part_number, brand, stock_quantity, price, min_stock_level } = req.body;
      
      if (name !== undefined) part.name = name;
      if (part_number !== undefined) part.part_number = part_number;
      if (brand !== undefined) part.brand = brand;
      if (stock_quantity !== undefined) part.stock_quantity = parseInt(stock_quantity);
      if (price !== undefined) part.price = parseFloat(price);
      if (min_stock_level !== undefined) part.min_stock_level = parseInt(min_stock_level);
      
      await part.save();

      await logAudit({
        req,
        action: 'PART_UPDATED',
        entityType: 'SparePart',
        entityId: part.id,
        oldValues,
        newValues: { name: part.name, part_number: part.part_number, brand: part.brand, stock_quantity: part.stock_quantity, price: part.price }
      });

      if (stock_quantity !== undefined && parseInt(stock_quantity) !== oldValues.stock_quantity) {
        await logAudit({
          req,
          action: 'PART_STOCK_ADJUSTED',
          entityType: 'SparePart',
          entityId: part.id,
          oldValues: { stock_quantity: oldValues.stock_quantity },
          newValues: { stock_quantity: part.stock_quantity }
        });
      }

      res.json({ message: 'Part updated successfully', part });
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
