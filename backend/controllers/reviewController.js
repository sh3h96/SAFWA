const { Review, User, Appointment } = require('../models');
const { logAudit } = require('../utils/auditLogger');

module.exports = {
  // GET /api/reviews
  getAllReviews: async (req, res) => {
    try {
      const { Vehicle } = require('../models');
      const reviews = await Review.findAll({
        include: [
          { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
          { 
            model: Appointment, 
            as: 'appointment',
            include: [
              { model: User, as: 'mechanic', attributes: ['id', 'name'] },
              { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate'] }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const formatted = reviews.map(r => ({
        id: r.id,
        client_id: r.client_id || r.client?.id,
        client: r.client?.name || 'غير معروف',
        clientEmail: r.client?.email || '',
        clientPhone: r.client?.phone || '',
        rating: r.rating,
        date: r.created_at,
        comment: r.comment || '',
        appointment_id: r.appointment_id,
        mechanic_id: r.appointment?.mechanic_id || r.appointment?.mechanic?.id,
        mechanic: r.appointment?.mechanic?.name || 'غير محدد',
        vehicle_id: r.appointment?.vehicle_id || r.appointment?.vehicle?.id,
        vehicle: r.appointment?.vehicle ? `${r.appointment.vehicle.make} ${r.appointment.vehicle.model}` : null,
        vehiclePlate: r.appointment?.vehicle?.license_plate || null
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

      if (!appointment_id || rating === undefined || rating === null) {
        return res.status(400).json({ message: 'appointment_id and rating are required' });
      }

      const numRating = Number(rating);
      if (
        typeof rating === 'boolean' ||
        isNaN(numRating) ||
        !Number.isInteger(numRating) ||
        numRating < 1 ||
        numRating > 5 ||
        (typeof rating === 'string' && rating.includes('.'))
      ) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
      }

      if (comment !== undefined && comment !== null && typeof comment !== 'string') {
        return res.status(400).json({ message: 'Comment must be a text string' });
      }

      if (typeof comment === 'string' && comment.length > 1000) {
        return res.status(400).json({ message: 'Comment exceeds maximum allowed length of 1000 characters' });
      }

      // Ownership Verification: Check if appointment belongs to current client
      const appointment = await Appointment.findOne({
        where: { id: appointment_id, client_id: req.user.id }
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found or unauthorized' });
      }

      // Service Eligibility Verification: Only completed or ready_for_pickup appointments can be reviewed
      if (!['completed', 'ready_for_pickup'].includes(appointment.status)) {
        return res.status(400).json({ message: 'Only completed services can be reviewed' });
      }

      // Duplicate Review Protection
      const existingReview = await Review.findOne({ where: { appointment_id } });
      if (existingReview) {
        return res.status(400).json({ message: 'Review already submitted for this appointment' });
      }

      const review = await Review.create({
        client_id: req.user.id,
        appointment_id,
        rating: numRating,
        comment: comment ? String(comment).trim() : ''
      });

      await logAudit({
        req,
        action: 'REVIEW_CREATED',
        entityType: 'Review',
        entityId: review.id,
        newValues: { appointment_id, rating: numRating, comment: comment ? String(comment).trim() : '' }
      });

      res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
