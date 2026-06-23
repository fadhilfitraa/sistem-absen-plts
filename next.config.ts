import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Tetap abaikan galat tipe data TypeScript saat proses build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;