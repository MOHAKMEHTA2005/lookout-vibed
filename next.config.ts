import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Firebase packages from being bundled into the SSR/prerender bundle.
  // Without this, Next.js tries to run firebase/database at build time (no env vars → crash).
  serverExternalPackages: [
    "firebase",
    "firebase/app",
    "firebase/auth",
    "firebase/database",
    "firebase/firestore",
    "firebase/storage",
  ],
};

export default nextConfig;
