const { SparePart } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // GET /api/inventory
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
        let status = 'good';
        let categoryVariant = 'success';
        
        if (part.stock_quantity <= part.min_stock_level) {
          status = 'low';
          categoryVariant = 'danger';
        } else if (part.stock_quantity <= part.min_stock_level + 5) {
          status = 'medium';
          categoryVariant = 'warning';
        }

        return {
          id: part.id,
          name: part.name,
          sku: part.part_number,
          category: 'عام', // Can be expanded with a category column later
          categoryVariant,
          manufacturer: part.brand || 'غير محدد',
          stock: part.stock_quantity,
          minStock: part.min_stock_level,
          createdAt: part.created_at || part.createdAt,
          maxStock: 100, // Placeholder
          status,
          purchasePrice: parseFloat(part.price),
          salePrice: parseFloat(part.price) * 1.2, // Mocking markup for sale price
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
          currentStart: offset + 1, 
          currentEnd: Math.min(offset + limit, count) 
        },
        filters: { manufacturers: ['الكل'] }, // Could aggregate distinct brands here
        lowStockAlert: { count: lowStockCount, message: `تنبيه: ${lowStockCount} قطع وصلت إلى حد الطلب الأدنى` }
      };

      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/inventory
  addPart: async (req, res) => {
    try {
      const { name, part_number, brand, price, stock_quantity, min_stock_level } = req.body;
      const newPart = await SparePart.create({
        name, part_number, brand, price, stock_quantity, min_stock_level
      });
      res.status(201).json({ message: 'Part added successfully', part: newPart });
    } catch (error) {
      console.error('Error adding part:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/inventory/:id
  updatePart: async (req, res) => {
    try {
      const part = await SparePart.findByPk(req.params.id);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      
      const { stock_quantity, price } = req.body;
      if (stock_quantity !== undefined) part.stock_quantity = stock_quantity;
      if (price !== undefined) part.price = price;
      
      await part.save();
      res.json({ message: 'Part updated successfully', part });
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
