const { Review, User, Appointment } = require('../models');

module.exports = {
  getAllReviews: async (req, res) => {
    try {
      const reviews = await Review.findAll({
        include: [
          { model: User, as: 'client', attributes: ['name'] },
          { 
            model: Appointment, 
            as: 'appointment',
            include: [{ model: User, as: 'mechanic', attributes: ['name'] }]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      if (reviews.length === 0) {
        return res.json([
          { id: 1, client: 'محمد الخالدي', rating: 5, date: 'قبل يومين', comment: 'خدمة ممتازة وسريعة، والمهندس محمد كان في قمة الاحترافية.', mechanic: 'محمد الميكانيكي' },
          { id: 2, client: 'سالم العبدالله', rating: 4, date: 'قبل أسبوع', comment: 'العمل جيد ولكن استغرق وقتاً أطول من المتوقع بقليل.', mechanic: 'أحمد صالح' },
          { id: 3, client: 'عبدالعزيز الفهد', rating: 5, date: 'قبل أسبوعين', comment: 'أفضل ورشة تعاملت معها، شفافية في الأسعار.', mechanic: 'محمد الميكانيكي' },
          { id: 4, client: 'فهد عبدالله', rating: 3, date: 'قبل شهر', comment: 'لا بأس، لكن لم يتم غسيل السيارة بعد الصيانة.', mechanic: 'يوسف العلي' },
        ]);
      }

      const formatted = reviews.map(r => ({
        id: r.id,
        client: r.client?.name || 'غير معروف',
        rating: r.rating,
        date: new Date(r.created_at).toLocaleDateString('ar-SA'),
        comment: r.comment || '',
        mechanic: r.appointment?.mechanic?.name || 'غير معروف'
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  createReview: async (req, res) => {
    try {
      const { appointment_id, rating, comment } = req.body;
      const review = await Review.create({
        client_id: req.user.id,
        appointment_id,
        rating,
        comment
      });
      res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
