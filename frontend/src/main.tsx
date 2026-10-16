import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { reloadForNewDeployment } from "@/app/chunk-load-recovery";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import "@/shared/i18n";
import "./index.css";

// A redeploy changes the code-split chunk hashes. If this browser still holds
// an older bundle, a lazily imported route chunk 404s; reload once to fetch
// the current build instead of surfacing an unhandled module error.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadForNewDeployment();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
