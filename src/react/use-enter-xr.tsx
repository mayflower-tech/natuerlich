import { useCallback } from "react";
import { XRTrackedImageInit, useXR } from "./index.js";

/**
 * @param mode either inline, immersive-vr, or immersive-ar
 * @param options required and optional webxr features and trackedImages
 * @returns a function to enter the described webxr session
 */
export function useEnterXR(
  mode: XRSessionMode,
  options?: XRSessionInit & {
    trackedImages?: ReadonlyArray<XRTrackedImageInit>;
  },
): () => Promise<void> {
  return useCallback(async () => {
    const xrSystem = navigator.xr;
    if (xrSystem == null) {
      return;
    }
    const session = await xrSystem.requestSession(mode, options);
    useXR.getState().setSession(session, mode, options?.trackedImages);
  }, [mode, options]);
}
