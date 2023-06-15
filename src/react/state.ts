import { Camera, RootState } from "@react-three/fiber";
import { Object3D, PerspectiveCamera } from "three";
import { StoreApi, create } from "zustand";
import { combine } from "zustand/middleware";

const xrInputSourceIdMap = new Map<XRInputSource, number>();

export type XRInputSourceMap = Map<number, XRInputSource>;

export type ExtendedXRSessionMode = XRState["mode"];

export type XRState = (
  | {
      mode: XRSessionMode;
      session: XRSession;
      inputSources: XRInputSourceMap;
      camera: Camera;
      initialCamera: Camera;
    }
  | {
      mode: "none";
      session?: undefined;
      inputSources?: undefined;
      camera?: undefined;
      initialCamera?: undefined;
    }
) & { store?: StoreApi<RootState> };

export type GrabbableEventListener = (inputSourceId: number, target: Object3D) => void;

export function getInputSourceId(inputSource: XRInputSource): number {
  let id = xrInputSourceIdMap.get(inputSource);
  if (id == null) {
    xrInputSourceIdMap.set(inputSource, (id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  }
  return id;
}

const initialState = {
  mode: "none",
} as XRState;

export const useXR = create(
  combine(initialState, (set, get) => ({
    setStore(store: StoreApi<RootState>) {
      set({ store });
    },
    onXRInputSourcesChanged(e: XRInputSourceChangeEvent) {
      const state = get();
      if (state.mode === "none") {
        console.warn(`received XRInputSourceChangeEvent while in xr mode "none"`);
        return;
      }
      const inputSources = new Map(state.inputSources);
      for (const remove of e.removed) {
        inputSources.delete(getInputSourceId(remove));
      }
      for (const add of e.added) {
        inputSources.set(getInputSourceId(add), add);
      }
      set({
        inputSources,
      } as Partial<XRState>);
    },
    onXREnd(store: StoreApi<RootState>, e: XRSessionEvent) {
      const { initialCamera, camera } = get();
      if (initialCamera == null || camera == null) {
        return;
      }
      set({
        mode: "none",
        session: undefined,
        inputSources: undefined,
      });
      const { camera: currentCamera, gl } = store.getState();
      (gl.xr as any).setUserCamera(undefined);

      if (currentCamera === camera) {
        store.setState({ camera: initialCamera });
      }
    },
    setSession(session: XRSession, mode: XRSessionMode) {
      const store = get().store;
      if (store == null) {
        return;
      }
      const inputSources: XRInputSourceMap = new Map();
      for (const inputSource of session.inputSources) {
        inputSources.set(getInputSourceId(inputSource), inputSource);
      }
      const camera = new PerspectiveCamera();
      const { camera: initialCamera, gl } = store.getState();
      set({ mode, session, inputSources, camera, initialCamera });
      (gl.xr as any).setUserCamera(camera);
      store.setState({ camera });
    },
  })),
);
