import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Where the payment page sends the player back (khelspot://payment-return?ref=…).
 * Checkout normally catches this itself; if the app was reopened from the link
 * instead, go straight to the booking, which reads its real status from the Server.
 */
export default function PaymentReturn() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  return ref ? <Redirect href={{ pathname: "/booked/[ref]", params: { ref } }} /> : <Redirect href="/" />;
}
