import { useEffect } from "react";
import { useXR } from "./index.js";

export function useSessionGrant(options?: XRSessionInit | undefined) {
  useEffect(() => {
    const xrSystem = navigator.xr;
    if (xrSystem == null) {
      return;
    }
    const listener = async (e: XRSystemSessionGrantedEvent) => {
      const session = await xrSystem.requestSession(e.session.mode, options);
      useXR.getState().setSession(session, e.session.mode);
    };
    xrSystem.addEventListener("sessiongranted", listener);
    return () => xrSystem.removeEventListener("sessiongranted", listener);
  }, []);
}
