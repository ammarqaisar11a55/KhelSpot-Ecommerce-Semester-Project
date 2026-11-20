import { PlannedScreen } from "@/screens/PlannedScreen";

// Phase 1 fills this with venues and open slots from the Server API.
export default function CourtsScreen() {
  return (
    <PlannedScreen
      kicker="Aaj raat khelna hai?"
      title={"Free courts\nin Lahore"}
      heading="Courts, open slots and prices"
      body="The venue list arrives once the app is connected to the KhelSpot server. It reaches this phone through Account › App updates."
      points={["Padel", "Futsal", "Indoor cricket", "Badminton"]}
    />
  );
}
