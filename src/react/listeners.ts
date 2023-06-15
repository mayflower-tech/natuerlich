import { useEffect } from "react";
import { getInputSourceId, useXR } from "./index.js";
import { shallow } from "zustand/shallow";

export function useSessionChange(
  onSessionChange: (session: XRSession | undefined, prevSession: XRSession | undefined) => void,
  deps: ReadonlyArray<any>,
) {
  useEffect(() => {
    //start
    onSessionChange(useXR.getState().session, undefined);
    const callback = useXR.subscribe((state, prevState) => {
      if (prevState.session === state.session) {
        return;
      }
      //update
      onSessionChange(state.session, prevState.session);
    });
    return () => {
      callback();
      //end
      onSessionChange(undefined, useXR.getState().session);
    };
  }, deps);
}

export function useInputSourceChange(
  onXRInputSourcesChange: (e: XRInputSourceChangeEvent) => void,
  deps: ReadonlyArray<any>,
) {
  useSessionChange((session, prevSession) => {
    if (prevSession != null) {
      prevSession.removeEventListener("inputsourceschange", onXRInputSourcesChange);
    }
    if (session != null) {
      session.addEventListener("inputsourceschange", onXRInputSourcesChange);
    }
  }, deps);
}

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export function useInputSourceEvent(
  name: "select" | "selectstart" | "selectend" | "squeeze" | "squeezestart" | "squeezeend",
  inputSource: XRInputSource,
  callback: (e: XRInputSourceEvent) => void,
  deps: ReadonlyArray<any>,
) {
  const session = useXR((state) => state.session);
  useEffect(() => {
    if (session == null) {
      return;
    }
    const pointerId = getInputSourceId(inputSource);
    const listener = (e: XRInputSourceEvent & Partial<Mutable<PointerEvent>>) => {
      if (e.inputSource != inputSource) {
        return;
      }
      e.pointerId = pointerId;
      callback(e);
    };
    session.addEventListener(name, listener);
    return () => {
      session.removeEventListener(name, listener);
    };
  }, [session, name, inputSource, ...deps]);
}

export function useInputSources(): Array<XRInputSource> {
  return useXR(
    (state) => (state.inputSources != null ? Array.from(state.inputSources.values()) : []),
    shallow,
  );
}
