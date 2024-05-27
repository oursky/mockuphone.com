import { defineConfig } from "astro/config";

import image from "@astrojs/image";
import redirects from "./src/scripts/redirect.json";

// https://astro.build/config
export default defineConfig({
  redirects,
  experimental: {
    redirects: true,
  },
  integrations: [image()],
});
