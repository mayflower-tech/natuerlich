import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { Quaternion, Vector3 } from "three";
import { useXR } from "./index.js";
import {
  createAnchor,
  createPersistedAnchor,
  deletePersistedAnchor,
  getPersistedAnchor,
} from "../anchor.js";

export function usePersistedAnchor(
  key: string,
): [
  anchor: XRAnchor | undefined,
  createAnchor: (worldPosition: Vector3, worldRotation: Quaternion) => Promise<void>,
] {
  const xr = useThree((s) => s.gl.xr);
  const session = useXR(({ session }) => session);
  const [anchor, setAnchor] = useState<XRAnchor | undefined>(undefined);
  useEffect(() => {
    if (session == null) {
      setAnchor(undefined);
      return;
    }
    getPersistedAnchor(session, key)
      .then(setAnchor)
      .catch((error) => {
        console.error(error);
        setAnchor(undefined);
      });
  }, [session, key]);
  const frameRef = useRef<XRFrame>();
  useFrame((state, delta, frame) => (frameRef.current = frame));
  const createAnchor = useCallback(
    async (worldPosition: Vector3, worldRotation: Quaternion) => {
      const frame = frameRef.current;
      if (frame == null) {
        return;
      }
      const session = useXR.getState().session;
      if (session != null) {
        deletePersistedAnchor(session, key);
      }
      const anchor = await createPersistedAnchor(key, xr, frame, worldPosition, worldRotation);
      if (anchor != null) {
        setAnchor(anchor);
      }
    },
    [xr, key],
  );
  return [anchor, createAnchor];
}

export function useAnchor(): [
  anchor: XRAnchor | undefined,
  createAnchor: (worldPosition: Vector3, worldRotation: Quaternion) => Promise<void>,
] {
  const xr = useThree((s) => s.gl.xr);
  const [anchor, setAnchor] = useState<XRAnchor | undefined>(undefined);
  const frameRef = useRef<XRFrame>();
  useFrame((state, delta, frame) => (frameRef.current = frame));
  const create = useCallback(
    async (worldPosition: Vector3, worldRotation: Quaternion) => {
      if (frameRef.current == null) {
        return;
      }
      const anchor = await createAnchor(xr, frameRef.current, worldPosition, worldRotation);
      if (anchor != null) {
        setAnchor(anchor);
      }
    },
    [xr],
  );
  return [anchor, create];
}
