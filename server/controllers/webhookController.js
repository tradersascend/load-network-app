const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Company = require('../models/Company');

const createPortalSession = async (req, res) => {
    try {
        const company = req.user.company;
        
        // Access stripeCustomerId from the correct location
        const stripeCustomerId = company?.stripeCustomerId || company?.subscription?.stripeCustomerId;
        
        if (!company || !stripeCustomerId) {
            return res.status(400).json({ 
                message: 'Stripe Customer ID not found for this company. Has the subscription been paid?' 
            });
        }
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/account`,
        });

        res.json({ url: portalSession.url });

    } catch (error) {
        console.error("Stripe portal error:", error);
        res.status(500).json({ 
            message: 'Failed to create billing portal session.',
            error: error.message 
        });
    }
};

const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const companyId = session.metadata.companyId;
    const stripeCustomerId = session.customer;

    try {
      const company = await Company.findById(companyId);
      if (company) {
        company.subscription.status = 'active';
        company.subscription.stripeCustomerId = stripeCustomerId;
        
        await company.save();
        console.log(`SUCCESS: Company ${company.companyName} has been activated.`);
      }
    } catch (error) {
      console.error('Error updating company after checkout:', error);
    }
  }

  res.status(200).json({ received: true });
};

module.exports = { 
    handleStripeWebhook,
    createPortalSession
};