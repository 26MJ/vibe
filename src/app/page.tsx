import { BoxOfficeDemo } from "@/components/box-office-demo";
import { BoxOfficeLive } from "@/components/box-office-live";
import { InsightsDashboard } from "@/components/insights-dashboard";

export default function Home() {
  const mode = process.env.DATA_MODE ?? "demo";
  return <><div>{mode === "live" ? <BoxOfficeLive /> : <BoxOfficeDemo dataMode={mode} />}</div><InsightsDashboard dataMode={mode} /></>;
}
