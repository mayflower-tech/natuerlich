import { useInputSourceProfile } from "./controller.js";
import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export enum ComponentState {
  DEFAULT = "default",
  TOUCHED = "touched",
  PRESSED = "pressed",
}

const ButtonTouchThreshold = 0.05;

export const useXRGamepadReader = (
  inputSource: XRInputSource,
  basePath?: string,
  defaultProfileId?: string,
) => {
  const profile = useInputSourceProfile(inputSource.profiles, basePath, defaultProfileId);

  const readGamepadButton = useCallback(
    (id: string) => {
      const gamepad = inputSource.gamepad;
      const profileComponents = profile?.layouts?.[inputSource.handedness]?.components;

      if (!gamepad || !profileComponents) {
        return;
      }

      const gamepadIndices = profileComponents[id]?.gamepadIndices;

      if (gamepadIndices?.button === undefined) {
        return;
      }

      return gamepad.buttons[gamepadIndices.button];
    },
    [inputSource.gamepad, inputSource.handedness, profile?.layouts],
  );

  const readButton = useCallback(
    (id: string) => {
      const gamepadButton = readGamepadButton(id);
      return gamepadButton ? Math.min(1, Math.max(0, gamepadButton.value)) : 0;
    },
    [readGamepadButton],
  );

  const readButtonState = useCallback(
    (id: string) => {
      const gamepadButton = readGamepadButton(id);

      // Set the state based on the button
      return gamepadButton
        ? gamepadButton.pressed || gamepadButton.value === 1
          ? ComponentState.PRESSED
          : gamepadButton.touched || gamepadButton.value > ButtonTouchThreshold
          ? ComponentState.TOUCHED
          : ComponentState.DEFAULT
        : ComponentState.DEFAULT;
    },
    [readGamepadButton],
  );

  const readAxisState = useCallback(
    (id: string) => {
      const gamepad = inputSource.gamepad;
      const profileComponents = profile?.layouts?.[inputSource.handedness]?.components;

      if (!gamepad || !profileComponents) {
        return;
      }

      const gamepadIndices = profileComponents[id]?.gamepadIndices;

      const x = gamepadIndices?.xAxis !== undefined ? gamepad.axes[gamepadIndices.xAxis] : 0;
      const y = gamepadIndices?.yAxis !== undefined ? gamepad.axes[gamepadIndices.yAxis] : 0;

      return { x, y };
    },
    [inputSource.gamepad, inputSource.handedness, profile?.layouts],
  );

  return useMemo(
    () => ({
      readButton,
      readGamepadButton,
      readButtonState,
      readAxisState,
    }),
    [readAxisState, readButton, readButtonState, readGamepadButton],
  );
};

export const useXRGamepadButton = (
  inputSource: XRInputSource,
  componentId: string,
  pressCallback: () => void,
  releaseCallback: () => void,
) => {
  const prevState = useRef(ComponentState.DEFAULT);
  const reader = useXRGamepadReader(inputSource);

  useFrame(() => {
    const newState = reader.readButtonState(componentId);

    if (!newState) {
      return;
    }

    if (prevState.current !== ComponentState.PRESSED && newState === ComponentState.PRESSED) {
      pressCallback();
    }

    if (prevState.current === ComponentState.PRESSED && newState !== ComponentState.PRESSED) {
      releaseCallback();
    }

    prevState.current = newState;
  });
};
