// JazzCash: NOT IMPLEMENTED. Placeholder until KhelSpot has a JazzCash merchant account.
//
// TODO(payments/jazzcash): implement PaymentProvider (see provider.ts):
// - startCheckout(): build the Hosted Checkout request (amount in paisa,
//   pp_TxnRefNo = booking.ref, pp_ReturnURL = `${baseUrl}/pay/jazzcash/callback`),
//   sign it with the integrity salt (HMAC-SHA256) and return the redirect URL.
// - handleCallback(): verify pp_SecureHash on the POSTed fields, map
//   pp_ResponseCode "000" to ok: true, and return pp_TxnRefNo as bookingRef.
// - Add a POST /pay/jazzcash/callback route that calls confirmPayment/failPayment.
//
// Environment it will need:
//   JAZZCASH_MERCHANT_ID
//   JAZZCASH_PASSWORD
//   JAZZCASH_INTEGRITY_SALT
//   JAZZCASH_ENV            sandbox | production
//
// Not referenced by createPaymentProvider() until it's real.
export {};
