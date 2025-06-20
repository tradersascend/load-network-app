const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Company = require('../models/Company');

const createCheckoutSession = async (req, res) => {
    const { tier } = req.body;
    const priceId = TIER_TO_PRICE_ID_MAP[tier];

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/welcome/{CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/register`,
        });
        res.status(200).json({ sessionId: session.id });
    } catch (error) {
        console.error("Stripe checkout error:", error);
        res.status(500).json({ message: "Failed to create payment session." });
    }
};

// This function creates a portal session for an EXISTING customer
const createPortalSession = async (req, res) => {
    try {
        const company = await Company.findById(req.user.company);
        if (!company || !company.stripeCustomerId) {
            return res.status(400).json({ message: 'Stripe customer ID not found.' });
        }

        // Create a portal session for this customer
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: company.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/account`, // Where to send them back to
        });

        // Return the URL for the portal session
        res.status(200).json({ url: portalSession.url });

    } catch (error) {
        console.error("Stripe portal error:", error);
        res.status(500).json({ message: 'Failed to create billing portal session.' });
    }
};


const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Use the raw request body to construct the event
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = {
    createCheckoutSession,
    createPortalSession,
    handleStripeWebhook,
};