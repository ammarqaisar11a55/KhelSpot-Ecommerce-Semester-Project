import { Redirect } from "expo-router";
import { homeFor, useRole } from "@/role/RoleProvider";

/** First launch asks who you are; after that the app opens on your side. */
export default function Index() {
  const { role } = useRole();
  return <Redirect href={role ? homeFor(role) : "/welcome"} />;
}
