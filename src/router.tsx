import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// When deployed to https://<user>.github.io/DotDotDone/ the app lives under
// /DotDotDone. In dev (Vite serves from /) BASE_URL is "/".
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    basepath,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
