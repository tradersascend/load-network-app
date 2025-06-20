const Load = require('../models/Load');
const getTransporter = require('../config/email');
const nodemailer = require('nodemailer');

const placeBid = async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) {
      return res.status(404).json({ message: 'Load not found.' });
    }

    const { subject, message } = req.body;
    const { _id: userId, companyName, email } = req.user;

    if (!load.bidders.includes(userId)) {
        load.bidders.push(userId);
        await load.save();
    }

    const emailOptions = {
      from: `"Load Network Bids" <bids@loadnetwork.com>`,
      to: load.brokerEmail,
      subject: subject || `Inquiry on Load #${load.sourceId} from ${companyName}`,
      replyTo: email,
      html: `
        <h1>Inquiry Regarding Load</h1>
        <p>This is an inquiry regarding load <strong>#${load.sourceId}</strong> (${load.origin.city} to ${load.destination.city}).</p>
        <hr>
        <h3>From:</h3>
        <ul>
          <li><strong>Company:</strong> ${companyName}</li>
          <li><strong>Contact Email:</strong> ${email}</li>
        </ul>
        <h3>Message:</h3>
        <p>${message || 'Please provide rates and more information on this load.'}</p>
      `
    };

    const transporter = await getTransporter();
    if (!transporter) {
        throw new Error("Email transporter could not be configured.");
    }
    
    const info = await transporter.sendMail(emailOptions);

    console.log("Bid email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('BIDDING ERROR:', error);
    res.status(500).json({ message: 'Server Error while sending message.' });
  }
};

module.exports = { placeBid };