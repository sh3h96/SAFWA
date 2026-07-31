const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Product = require('../models/Product');

router.post('/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, stock } = req.body;

        if (!name || !price) {
            return res.status(400).json({ status: 'error', message: 'اسم المنتج والسعر مطلوبان' });
        }

        const imageName = req.file ? req.file.filename : null;

        const newProduct = await Product.create({
            name,
            price,
            stock: stock || 0,
            image: imageName
        });

        const fullImageUrl = imageName 
            ? `${req.protocol}://${req.get('host')}/uploads/${imageName}` 
            : null;

        return res.status(201).json({
            status: 'success',
            message: 'تم إضافة المنتج بنجاح!',
            data: {
                ...newProduct.toJSON(),
                image_url: fullImageUrl
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;