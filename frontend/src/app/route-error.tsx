import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";

import {
  isChunkLoadError,
  reloadForNewDeployment,
  shouldReloadForNewDeployment,
} from "@/app/chunk-load-recovery";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Route-level error boundary. When a route fails to load because the client
 * holds a stale code-split chunk (after a redeploy), it reloads once to fetch
 * the current build instead of showing React Router's default crash screen.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();
  const recovering = isChunkLoadError(error) && shouldReloadForNewDeployment();

  useEffect(() => {
    if (recovering) {
      reloadForNewDeployment();
    }
  }, [recovering]);

  if (recovering) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-medium">{t("routeError.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("routeError.description")}</p>
        <Button size="sm" className="mt-5" onClick={() => window.location.reload()}>
          {t("routeError.reload")}
        </Button>
      </div>
    </div>
  );
}
