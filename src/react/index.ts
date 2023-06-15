import { useStore, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { useXR } from "./state.js";

export * from "./use-enter-xr.js";
export * from "./use-session-grant.js";
export * from "./space.js";
export * from "./guards/index.js";
export * from "./listeners.js";
export * from "./controller.js";
export * from "./hand.js";
export * from "./state.js";
export * from "./anchor.js";
export * from "./session-origin.js";
export * from "./anchor.js";
export * from "./camera.js";

export function useNativeFramebufferScaling(): number | undefined {
  return useXR((state) =>
    state.session == null ? undefined : XRWebGLLayer.getNativeFramebufferScaleFactor(state.session),
  );
}

export function useAvailableFrameRates(): Float32Array | undefined {
  return useXR((state) => (state.session == null ? undefined : state.session.supportedFrameRates));
}

export function useHeighestAvailableFrameRate(): number | undefined {
  const framerates = useAvailableFrameRates();
  return useMemo(() => {
    if (framerates == null) {
      return;
    }
    return Math.max(...framerates);
  }, [framerates]);
}

/**
 * must be positioned somewhere inside the canvas
 */
export function XR({
  foveation = 0,
  frameRate,
  referenceSpace = "local-floor",
  frameBufferScaling,
}: {
  foveation?: number;
  frameRate?: number;
  referenceSpace?: XRReferenceSpaceType;
  frameBufferScaling?: number;
}) {
  const xrManager = useThree((state) => state.gl.xr);
  const store = useStore();
  const session = useXR((state) => state.session);

  useEffect(() => useXR.getState().setStore(store), [store]);

  useEffect(() => {
    xrManager.setFoveation(foveation);
  }, [xrManager, foveation]);

  useEffect(() => {
    if (frameRate == null) {
      return;
    }
    return useXR.subscribe((state, prevState) => {
      if (state.session === prevState.session || state.session == null) {
        return;
      }
      state.session.updateTargetFrameRate(frameRate).catch(console.error);
    });
  }, [frameRate]);

  useEffect(() => {
    if (frameBufferScaling == null) {
      return;
    }
    return useXR.subscribe((state, prevState) => {
      if (state.session === prevState.session || state.session == null) {
        return;
      }
      xrManager.setFramebufferScaleFactor(frameBufferScaling);
    });
  }, [xrManager, frameBufferScaling]);

  useEffect(() => {
    xrManager.setReferenceSpaceType(referenceSpace);
  }, [xrManager, referenceSpace]);

  useEffect(() => {
    const state = useXR.getState();
    const onXREnd = state.onXREnd.bind(state, store);
    const onXRInputSourcesChanged = state.onXRInputSourcesChanged;
    xrManager.setSession(session ?? null);
    if (session == null) {
      return;
    }
    //add new listeners
    session.addEventListener("inputsourceschange", onXRInputSourcesChanged);
    session.addEventListener("end", onXREnd);

    return () => {
      //clear old listeners
      session.removeEventListener("inputsourceschange", state.onXRInputSourcesChanged);
      session.removeEventListener("end", onXREnd);
      //assure the session is ended when it is removed from the state
      session.end().catch(console.error);
    };
  }, [xrManager, session, store]);
  return null;
}
