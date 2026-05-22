import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industry Resources",
  description:
    "Curated directory of warehouse racking standards, manufacturers, accessories, and industry tools. Research suppliers and find the right racking partner for your project.",
  keywords: [
    "warehouse racking resources",
    "racking manufacturers",
    "FEM standards",
    "pallet racking supplier",
    "racking standards directory",
    "warehouse equipment",
    "China racking manufacturers",
  ],
  alternates: {
    canonical: "https://rackinghub.com/resources/",
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
