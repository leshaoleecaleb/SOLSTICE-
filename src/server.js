const express = require('express');
const app = express();
app.use(express.json());

// In-memory mock database & state tracking
const attendeesDb = new Map();

// 1. Kiosk Check-In Endpoint
app.post('/api/v1/check-in', async (req, res) => {
  const { attendeeId } = req.body;
  const currentStatus = attendeesDb.get(attendeeId) || 'NOT_CHECKED_IN';
  
  // Atomic Guardrail: Block duplicate scans or already checked-in attendees
  if (currentStatus === 'CHECKING_IN_PENDING' || currentStatus === 'CHECKED_IN') {
    return res.status(409).json({ error: 'Duplicate scan or already checked in.' });
  }

  // Set pending state
  attendeesDb.set(attendeeId, 'CHECKING_IN_PENDING');

  return res.status(202).json({ status: 'CHECKING_IN_PENDING' });
});

// 2. Inbound Printer Webhook
app.post('/v1/webhooks/badge-printed', async (req, res) => {
  const { attendee_id, status } = req.body;

  if (status === 'SUCCESS') {
    attendeesDb.set(attendee_id, 'CHECKED_IN');
  } else {
    attendeesDb.set(attendee_id, 'FAILED');
  }

  return res.status(200).json({ received: true });
});

// Export app for Supertest / Jest integration
module.exports = app;

// Only start listening if run directly (e.g. npm start)
if (require.main === module) {
  app.listen(3000, () => console.log('Kiosk API running on port 3000'));
}
