import type { Metadata } from "next";
import TeCanteiApp from "@/components/te-cantei-app";

export const metadata: Metadata = { title: "Criar minha música", robots: { index: false, follow: false } };

export default function CreatePage() {
  return <TeCanteiApp initialStep={1} />;
}
