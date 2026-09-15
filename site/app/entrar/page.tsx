import type { Metadata } from "next";
import TeCanteiApp from "@/components/te-cantei-app";

export const metadata: Metadata = { title: "Entrar ou criar conta", robots: { index: false, follow: false } };

export default function SignInPage() {
  return <TeCanteiApp initialAccountOpen />;
}
