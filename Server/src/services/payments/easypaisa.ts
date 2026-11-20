// Easypaisa: NOT IMPLEMENTED. Placeholder until KhelSpot has an Easypaisa merchant account.
//
// TODO(payments/easypaisa): implement PaymentProvider (see provider.ts):
// - startCheckout(): create the hosted checkout (orderRefNum = booking.ref,
//   amount in Rs, postBackURL = `${baseUrl}/pay/easypaisa/callback`), add the
//   hashed request signature, and return the redirect URL.
// - handleCallback(): verify the signature on the callback, map a successful
//   status to ok: true, and return orderRefNum as bookingRef.
// - Add the callback route that calls confirmPayment/failPayment.
//
// Environment it will need:
//   EASYPAISA_STORE_ID
//   EASYPAISA_HASH_KEY
//   EASYPAISA_ENV           sandbox | production
//
// Not referenced by createPaymentProvider() until it's real.
export {};
