import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB — safety notice images are stored as base64 data URIs
    // in the request body (see src/lib/image-upload.ts), which are ~33%
    // larger than the raw file. 5mb comfortably fits the 3MB raw-file cap
    // enforced in image-upload.ts plus multipart/base64 overhead.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
