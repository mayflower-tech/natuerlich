import { Camera, RootState } from "@react-three/fiber";
import { Object3D } from "three";
import { StoreApi, create } from "zustand";
import { combine } from "zustand/middleware";
import { getInputSourceId } from "../index.js";
import { MotionController } from "@webxr-input-profiles/motion-controllers";

export type XRImageTrackingScore = "untrackable" | "trackable";

export type XRImageTrackingState = "tracked" | "emulated";

export type XRImageTrackingResult = {
  readonly imageSpace: XRSpace;
  readonly index: number;
  readonly trackingState: XRImageTrackingState;
  readonly measuredWidthInMeters: number;
};

export type XRTrackedImageInit = {
  image: ImageBitmap;
  widthInMeters: number;
};

export type XRInputSourceMap = Map<number, XRInputSource>;

export type TrackedImagesMap = Map<number, XRImageTrackingResult>;

export type ExtendedXRSessionMode = XRState["mode"];

export type XRState = (
  | {
      mode: XRSessionMode;
      session: XRSession;
      inputSources: XRInputSourceMap;

      //only for internal reference
      initialCamera: Camera;
      layers: Array<{ index: number; layer: XRLayer }>;
      trackedImages: TrackedImagesMap;
      requestedTrackedImages?: ReadonlyArray<XRTrackedImageInit>;
      trackedPlanes: ReadonlyArray<XRPlane>;
      visibilityState: XRVisibilityState;
    }
  | {
      mode: "none";
      session?: undefined;
      inputSources?: undefined;
      initialCamera?: undefined;
      layers?: undefined;
      trackedImages?: undefined;
      requestedTrackedImages?: undefined;
      trackedPlanes?: undefined;
      visibilityState?: undefined;
    }
) & {
  store?: StoreApi<RootState>;
  onNextFrameCallbacks: Set<(state: RootState, delta: number, frame: XRFrame | undefined) => void>;
  motionControllers: Map<XRInputSource, MotionController>;
};

export type GrabbableEventListener = (inputSourceId: number, target: Object3D) => void;

const initialState = {
  mode: "none",
  onNextFrameCallbacks: new Set(),
  motionControllers: new Map(),
} as XRState;

/**
 * allow to subscribe to the current xr state
 * allows to retrieve the current state via useXR.getState()
 */
export const useXR = create(
  combine(initialState, (set, get) => ({
    onFrame: (state: RootState, delta: number, frame: XRFrame | undefined) => {
      const { trackedImages, requestedTrackedImages, trackedPlanes, onNextFrameCallbacks } = get();

      for (const onNextFrameCallback of onNextFrameCallbacks) {
        onNextFrameCallback(state, delta, frame);
      }
      onNextFrameCallbacks.clear();

      //handle tracked planes

      const detectedPlanes = (frame as { detectedPlanes?: XRPlaneSet })?.detectedPlanes;
      let newPlanes = trackedPlanes;

      if (detectedPlanes == null) {
        newPlanes = undefined;
      } else if (trackedPlanes == null || trackedPlanes.length != detectedPlanes.size) {
        newPlanes = Array.from(detectedPlanes);
      } else {
        for (const plane of detectedPlanes) {
          if (!trackedPlanes.includes(plane)) {
            newPlanes = Array.from(detectedPlanes);
            break;
          }
        }
      }
      if (newPlanes != trackedPlanes) {
        set({ trackedPlanes: newPlanes });
      }

      //handle tracked images
      if (
        trackedImages != null &&
        requestedTrackedImages != null &&
        requestedTrackedImages.length > 0
      ) {
        trackedImages.clear();
        if (frame != null && "getImageTrackingResults" in frame) {
          const results = (
            frame.getImageTrackingResults as () => ReadonlyArray<XRImageTrackingResult>
          )();
          for (const result of results) {
            trackedImages.set(result.index, result);
          }
        }
      }
    },
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
      state.layers = state.layers.filter(({ layer: l }) => l != layer);
      state.session.updateRenderState({
        layers: state.layers.map(({ layer }) => layer),
      });
    },
    onVisibilityStateChanged(e: XRSessionEvent) {
      const state = get();
      if (state.mode === "none") {
        console.warn(`received onVsibilityStateChanged while in xr mode "none"`);
        return;
      }
      set({
        visibilityState: e.session.visibilityState,
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
      const { store, initialCamera } = get();
      if (store == null) {
        return;
      }
      set({
        mode: "none",
        session: undefined,
        inputSources: undefined,
        initialCamera: undefined,
        layers: undefined,
        requestedTrackedImages: undefined,
        trackedImages: undefined,
        trackedPlanes: undefined,
        visibilityState: undefined,
      });
      const { camera } = store.getState();
      //(gl.xr as any).setUserCamera(undefined);

      if (camera === store.getState().gl.xr.getCamera()) {
        store.setState({ camera: initialCamera });
      }
    },
    async setSession(
      session: XRSession,
      mode: XRSessionMode,
      requestedTrackedImages?: ReadonlyArray<XRTrackedImageInit>,
    ) {
      if (
        requestedTrackedImages != null &&
        requestedTrackedImages.length > 0 &&
        "getTrackedImageScores" in session
      ) {
        const scores = await (
          session.getTrackedImageScores as () => Promise<ReadonlyArray<XRImageTrackingScore>>
        )();
        for (let index = 0; index < scores.length; ++index) {
          if (scores[index] == "untrackable") {
            console.error(
              `Provided image at index "${index}" is untrackable.`,
              requestedTrackedImages?.[index],
            );
          }
        }
      }

      //clear old event listeners
      const oldSession = get().session;
      if (oldSession != null) {
        oldSession.removeEventListener("inputsourceschange", this.onXRInputSourcesChanged);
        oldSession.removeEventListener("end", this.onXREnd);
        oldSession.removeEventListener("visibilitychange", this.onVisibilityStateChanged);
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
      session.addEventListener("visibilitychange", this.onVisibilityStateChanged);

      const { gl, camera } = store.getState();
      //fake camera we use to represent the transformation when in XR
      //const camera = new PerspectiveCamera();

      //update xr manager
      await gl.xr.setSession(session);
      //(gl.xr as any).setUserCamera(camera);

      //update XR state & r3f state
      set({
        mode,
        session,
        inputSources,
        initialCamera: camera,
        trackedImages: new Map(),
        visibilityState: session.visibilityState,
        requestedTrackedImages,
        layers: [{ index: 0, layer: gl.xr.getBaseLayer() }],
        trackedPlanes: [],
      });
      store.setState({ camera: gl.xr.getCamera() });
    },
  })),
);
