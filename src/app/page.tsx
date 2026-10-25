import { BoxOfficeDemo } from "@/components/box-office-demo";

export default function Home() {
  return <BoxOfficeDemo dataMode={process.env.DATA_MODE ?? "demo"} />;
}
