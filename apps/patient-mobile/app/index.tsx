import { Redirect } from "expo-router";
import { useSession } from "../src/loop/session";
export default function IndexScreen() {
  const { ready, token } = useSession();
  return ready ? <Redirect href={token ? "/(tabs)" : "/login"} /> : null;
}
