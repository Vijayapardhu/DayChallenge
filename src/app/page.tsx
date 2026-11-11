import { ArcadeApp } from "@/components/ArcadeApp";
import { AppProvider } from "@/lib/store";

export default function Home() {
  return (
    <AppProvider>
      <ArcadeApp />
    </AppProvider>
  );
}
