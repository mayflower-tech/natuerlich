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

      //only for internal reference
      initialCamera: Camera;
      layers: Array<{ index: number; layer: XRLayer }>;
    }
  | {
      mode: "none";
      session?: undefined;
      inputSources?: undefined;
      camera?: undefined;
      initialCamera?: undefined;
      layers?: undefined;
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
    addLayer(index: number, layer: XRLayer) {
      const { session, layers } = get();
      if (layers == null || session == null) {
        return;
      }
      layers.push({ index, layer });
      layers.sort(({ index: i1 }, { index: i2 }) => i1 - i2);
      session.updateRenderState({
        layers: layers.map(({ layer }) => layer),
      });
    },
    removeLayer(layer: XRLayer) {
      const state = get();
      if (state.layers == null || state.session == null) {
        return;
      }
      state.layers.filter(({ layer: l }) => l != layer);
      state.session.updateRenderState({
        layers: state.layers.map(({ layer }) => layer),
      });
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
    onXREnd(e: XRSessionEvent) {
      const { initialCamera, camera, store } = get();
      if (initialCamera == null || camera == null || store == null) {
        return;
      }
      set({
        mode: "none",
        session: undefined,
        inputSources: undefined,
        camera: undefined,
        initialCamera: undefined,
        layers: undefined,
      });
      const { camera: currentCamera, gl } = store.getState();
      (gl.xr as any).setUserCamera(undefined);

      if (currentCamera === camera) {
        store.setState({ camera: initialCamera });
      }
    },
    async setSession(session: XRSession, mode: XRSessionMode) {
      //clear old event listeners
      const oldSession = get().session;
      if (oldSession != null) {
        oldSession.removeEventListener("inputsourceschange", this.onXRInputSourcesChanged);
        oldSession.removeEventListener("end", this.onXREnd);
        //assure the session is ended when it is removed from the state
        oldSession.end().catch(console.error);
      }

      const store = get().store;
      if (store == null) {
        return;
      }
      const inputSources: XRInputSourceMap = new Map();
      for (const inputSource of session.inputSources) {
        inputSources.set(getInputSourceId(inputSource), inputSource);
      }

      //add event listeners
      session.addEventListener("inputsourceschange", this.onXRInputSourcesChanged);
      session.addEventListener("end", this.onXREnd);

      const { camera: initialCamera, gl } = store.getState();
      //fake camera we use to represent the transformation when in XR
      const camera = new PerspectiveCamera();

      //update xr manager
      await gl.xr.setSession(session);
      (gl.xr as any).setUserCamera(camera);

      //update XR state & r3f state
      set({
        mode,
        session,
        inputSources,
        camera,
        initialCamera,
        layers: [{ index: 0, layer: gl.xr.getBaseLayer() }],
      });
      store.setState({ camera });
    },
  })),
);
