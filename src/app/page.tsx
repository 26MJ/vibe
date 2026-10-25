import { BoxOfficeDemo } from "@/components/box-office-demo";
import { BoxOfficeLive } from "@/components/box-office-live";

export default function Home() {
  const mode = process.env.DATA_MODE ?? "demo";
  return mode === "live" ? <BoxOfficeLive /> : <BoxOfficeDemo dataMode={mode} />;
}
