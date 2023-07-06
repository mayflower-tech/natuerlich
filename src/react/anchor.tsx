import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Quaternion, Vector3 } from "three";
import { useXR } from "./index.js";
import {
  createAnchor,
  createPersistedAnchor,
  deletePersistedAnchor,
  getPersistedAnchor,
} from "../anchor.js";

export function useAnchor(): [
  anchor: XRAnchor | undefined,
  createAnchor: (worldPosition: Vector3, worldRotation: Quaternion) => Promise<void>,
] {
  const [anchor, setAnchor] = useState<XRAnchor | undefined>(undefined);
  const destroyed = useRef(false);
  const create = useCallback(
    async (worldPosition: Vector3, worldRotation: Quaternion) =>
      void useXR.getState().onNextFrameCallbacks.add(async (state, _delta, frame) => {
        if (frame == null || destroyed.current) {
          return;
        }
        const anchor = await createAnchor(state.gl.xr, frame, worldPosition, worldRotation);
        if (anchor == null || destroyed.current) {
          return;
        }
        setAnchor(anchor);
      }),
    [],
  );
  useEffect(
    () => () => {
      //cleanup => prevents setAnchor
      destroyed.current = true;
    },
    [],
  );
  return [anchor, create];
}

export function usePersistedAnchor(
  key: string,
): [
  anchor: XRAnchor | undefined,
  createAnchor: (worldPosition: Vector3, worldRotation: Quaternion) => Promise<void>,
] {
  const session = useXR(({ session }) => session);
  const [anchor, setAnchor] = useState<XRAnchor | undefined>(undefined);
  const state = useMemo(() => ({ destroyed: false, session, key }), [session, key]);

  useEffect(() => {
    setAnchor(undefined);
    if (state.session == null) {
      return;
    }
    getPersistedAnchor(state.session, state.key)
      .then((anchor) => {
        if (state.destroyed) {
          return;
        }
        setAnchor(anchor);
      })
      .catch((error) => {
        if (state.destroyed) {
          return;
        }
        console.error(error);
        setAnchor(undefined);
      });
    return () => {
      state.destroyed = true;
    };
  }, [state]);

  const create = useCallback(
    async (worldPosition: Vector3, worldRotation: Quaternion) =>
      void useXR.getState().onNextFrameCallbacks.add(async (rootState, _delta, frame) => {
        if (frame == null || state.session == null || state.destroyed) {
          return;
        }
        //cleanup prev anchor
        deletePersistedAnchor(state.session, state.key);
        //make new anchor
        const anchor = await createPersistedAnchor(
          state.key,
          rootState.gl.xr,
          frame,
          worldPosition,
          worldRotation,
        );
        if (anchor == null || state.destroyed) {
          return;
        }
        setAnchor(anchor);
      }),
    [state],
  );
  return [anchor, create];
}
