import { PlannedScreen } from "@/screens/PlannedScreen";

export default function OwnerBookings() {
  return (
    <PlannedScreen
      title="Bookings"
      heading="Who booked, and who still owes"
      body="Needs owner sign-in, so only you see your players. Then: search by name, phone or booking ID, mark cash as paid, add walk-ins, cancel with a full refund, and call or WhatsApp the player. Until then, use the web dashboard."
    />
  );
}
