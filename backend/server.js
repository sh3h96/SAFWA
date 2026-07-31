require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // لاستخدام مسارات المجلدات بشكل آمن
const sequelize = require('./config/database');

// استدعاء مسارات المنتجات (تأكد من المسار لديك)
const productRoutes = require('./routes/productRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middlewares الأساسية
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // لدعم بيانات Form Data

// 2. إتاحة مجلد الصور للوصول العام (Static Folder)
// لكي تفتح الصور عبر الرابط: http://localhost:5000/uploads/image.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. ربط المسارات (Routes)
app.use('/api/products', productRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('SAFWA Backend API is running...');
});

// 4. مزامنة قاعدة البيانات وتشغيل السيرفر
// ملاحظة: يُفضل استخدام { alter: true } في بيئة التطوير لتحديث الجداول تلقائياً
sequelize.sync()
  .then(() => {
    console.log('✅ Database synced successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error syncing database:', error);
  });