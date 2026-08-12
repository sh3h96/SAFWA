const { Review, User, Appointment } = require('../models');

module.exports = {
  // GET /api/reviews
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

      const formatted = reviews.map(r => ({
        id: r.id,
        client: r.client?.name || 'غير معروف',
        rating: r.rating,
        date: new Date(r.created_at).toLocaleDateString('ar-SA'),
        comment: r.comment || '',
        mechanic: r.appointment?.mechanic?.name || 'غير محدد'
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/reviews
  createReview: async (req, res) => {
    try {
      const { appointment_id, rating, comment } = req.body;

      if (!appointment_id || !rating) {
        return res.status(400).json({ message: 'appointment_id and rating are required' });
      }

      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
      }

      // Ownership Verification: Check if appointment belongs to current client
      const appointment = await Appointment.findOne({
        where: { id: appointment_id, client_id: req.user.id }
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found or unauthorized' });
      }

      // Check if review already exists for this appointment
      const existingReview = await Review.findOne({ where: { appointment_id } });
      if (existingReview) {
        return res.status(400).json({ message: 'Review already submitted for this appointment' });
      }

      const review = await Review.create({
        client_id: req.user.id,
        appointment_id,
        rating: numericRating,
        comment: comment || ''
      });

      res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
