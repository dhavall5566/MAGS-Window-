import { readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import type { NextConfig } from "next";

/** v{major}.{minor}.{commit-count} — bumps automatically on each new commit/deploy. */
function getAppVersionLabel(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { version?: string };
    const [major = "0", minor = "1"] = (pkg.version ?? "0.1.0").split(".");
    const build = execSync("git rev-list --count HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return `v${major}.${minor}.${build}`;
  } catch {
    try {
      const pkg = JSON.parse(
        readFileSync(path.join(process.cwd(), "package.json"), "utf8")
      ) as { version?: string };
      return `v${pkg.version ?? "0.0.0"}`;
    } catch {
      return "v0.0.0";
    }
  }
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersionLabel(),
  },
  transpilePackages: ["recharts", "jspdf", "jspdf-autotable"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;
