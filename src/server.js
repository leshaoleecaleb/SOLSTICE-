const express = require('express');
const app = express();
app.use(express.json());

// 1. Kiosk Check-In Endpoint
app.post('/api/v1/check-in', async (req, res) => {
  const { attendeeId } = req.body;
  
  // Atomic DB Lock to prevent concurrent duplicate scans
  const query = `
    UPDATE attendees 
    SET status = 'CHECKING_IN_PENDING' 
    WHERE attendee_id = $1 AND status IN ('NOT_CHECKED_IN', 'FAILED')
    RETURNING *;
  `;
  
  const result = await db.query(query, [attendeeId]);
  
  if (result.rowCount === 0) {
    return res.status(409).json({ error: 'Duplicate scan or already checked in.' });
  }

  // Publish print job to Vendor Message Queue
  await messageQueue.publish({
    print_job_id: `job_${Date.now()}`,
    attendee_id: attendeeId,
    callback_url: 'https://api.solstice.com/v1/webhooks/badge-printed'
  });

  return res.status(202).json({ status: 'CHECKING_IN_PENDING' });
});

// 2. Inbound Printer Webhook
app.post('/v1/webhooks/badge-printed', async (req, res) => {
  const { attendee_id, status } = req.body;

  if (status === 'SUCCESS') {
    await db.query(`UPDATE attendees SET status = 'CHECKED_IN' WHERE attendee_id = $1`, [attendee_id]);
  } else {
    await db.query(`UPDATE attendees SET status = 'FAILED' WHERE attendee_id = $1`, [attendee_id]);
  }

  return res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Kiosk API running on port 3000'));
