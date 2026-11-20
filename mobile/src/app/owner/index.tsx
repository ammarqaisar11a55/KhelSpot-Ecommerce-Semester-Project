import { PlannedScreen } from "@/screens/PlannedScreen";

export default function OwnerToday() {
  return (
    <PlannedScreen
      kicker="Tonight at your venue"
      title="Today"
      heading="Sign in to your venue"
      body="Owner sign-in and your live bookings arrive with the server connection. Until then, keep using the web dashboard."
      points={["Who's on court now", "Next arrivals", "Unpaid at venue", "Add a walk-in"]}
    />
  );
}
