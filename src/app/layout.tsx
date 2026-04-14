import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "TravelAI — AI-Powered Travel Planning",
  description: "Plan your perfect trip with AI. Get personalized itineraries, discover hidden gems, and explore 40+ destinations worldwide.",
  keywords: "travel, AI, itinerary, planner, destinations, trips, vacation",
  openGraph: {
    title: "TravelAI — AI-Powered Travel Planning",
    description: "Plan your perfect trip with AI. Get personalized itineraries, discover hidden gems, and explore 40+ destinations worldwide.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
