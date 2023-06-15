import { useCallback } from "react";
import { useXR } from "./index.js";

export function useEnterXR(mode: XRSessionMode, options?: XRSessionInit) {
  return useCallback(async () => {
    const xrSystem = navigator.xr;
    if (xrSystem == null) {
      return;
    }
    const session = await xrSystem.requestSession(mode, options);
    useXR.getState().setSession(session, mode);
  }, [mode, options]);
}
