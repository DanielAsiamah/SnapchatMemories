const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const stripe = require("stripe")(); // We don't need the API key to verify signatures, only the webhook secret

admin.initializeApp();

exports.stripeWebhook = onRequest(async (req, res) => {
  // 1. Get the raw body and the Stripe signature header
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
    res.status(500).send("Webhook secret not configured.");
    return;
  }

  let event;

  try {
    // 2. Verify the cryptographic signature using the raw buffer
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // 3. Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;

    if (userId) {
      console.log(`Payment successful for user: ${userId}. Upgrading to Pro...`);
      try {
        // Update the exact user document our Desktop App is listening to!
        await admin.firestore().collection("users").doc(userId).set({
          isPremium: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`Successfully upgraded user ${userId}`);
      } catch (dbErr) {
        console.error("Database error while upgrading user:", dbErr);
        res.status(500).send("Database error");
        return;
      }
    } else {
      console.warn("Payment completed, but no client_reference_id was attached!");
    }
  }

  // 4. Acknowledge receipt to Stripe
  res.json({ received: true });
});
