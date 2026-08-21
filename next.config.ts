import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Keep these out of the server bundle.
   *
   * Turbopack bundles server code by default, which breaks node-postgres: it
   * reaches for Node's net and tls modules and resolves optional native
   * dependencies at runtime, none of which survive being rewritten by a
   * bundler. The symptom is misleading — every query fails with
   * "Can't reach database server" (Prisma P1001), which looks like a network
   * or credentials problem rather than a build one. Marking these external
   * makes them plain require() calls at runtime.
   */
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

  images: {
    /**
     * Campus photographs are served from Unsplash. next/image refuses remote
     * hosts that are not listed here, deliberately: without an allowlist any
     * user-supplied URL could turn this app's image endpoint into an open
     * proxy for arbitrary internet content.
     */
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
