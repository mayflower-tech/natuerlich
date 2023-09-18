import { useInputSourceProfile } from "./controller.js";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { ControllerComponent } from "../index.js";

export enum ComponentState {
  DEFAULT = "default",
  TOUCHED = "touched",
  PRESSED = "pressed",
}

export type ComponentValues = {
  state: ComponentState;
  button?: number;
  xAxis?: number;
  yAxis?: number;
};

export type GamepadValues = GamepadValues;

const ButtonTouchThreshold = 0.05;
const AxisTouchThreshold = 0.1;

export const useXRGamepadValues = (
  inputSource: XRInputSource,
  callback: (values: GamepadValues) => void,
  basePath?: string,
  defaultProfileId?: string,
) => {
  const profile = useInputSourceProfile(inputSource.profiles, basePath, defaultProfileId);
  const [components] = useState<Record<string, ControllerComponent>>({});
  const [gamepadValues] = useState<GamepadValues>({});

  useEffect(() => {
    const profileComponents = profile?.layouts?.[inputSource.handedness]?.components;
    if (!profileComponents) {
      return;
    }

    Object.keys(profileComponents).forEach((componentId) => {
      components[componentId] = profileComponents[componentId];
      const gamepadIndices = components[componentId].gamepadIndices;

      gamepadValues[componentId] = {
        state: ComponentState.DEFAULT,
        ...(gamepadIndices.button !== undefined ? { button: 0 } : {}),
        ...(gamepadIndices.xAxis !== undefined ? { xAxis: 0 } : {}),
        ...(gamepadIndices.yAxis !== undefined ? { yAxis: 0 } : {}),
      };
    });
  }, [components, inputSource.handedness, profile, gamepadValues]);

  useFrame(() => {
    const gamepad = inputSource.gamepad;

    if (!gamepad) {
      return;
    }

    Object.keys(components).forEach((componentId) => {
      const component = components[componentId];
      const values = gamepadValues[componentId];
      values.state = ComponentState.DEFAULT;
      const gamepadIndices = component.gamepadIndices;

      // Get and normalize button
      if (gamepadIndices.button !== undefined && gamepad.buttons.length > gamepadIndices.button) {
        const gamepadButton = gamepad.buttons[gamepadIndices.button];
        values.button = gamepadButton.value;
        values.button = values.button < 0 ? 0 : values.button;
        values.button = values.button > 1 ? 1 : values.button;

        // Set the state based on the button
        if (gamepadButton.pressed || values.button === 1) {
          values.state = ComponentState.PRESSED;
        } else if (gamepadButton.touched || values.button > ButtonTouchThreshold) {
          values.state = ComponentState.TOUCHED;
        }
      }

      // Get and normalize x axis value
      if (gamepadIndices.xAxis !== undefined && gamepad.axes.length > gamepadIndices.xAxis) {
        values.xAxis = gamepad.axes[gamepadIndices.xAxis];
        values.xAxis = values.xAxis < -1 ? -1 : values.xAxis;
        values.xAxis = values.xAxis > 1 ? 1 : values.xAxis;

        // If the state is still default, check if the xAxis makes it touched
        if (
          values.state === ComponentState.DEFAULT &&
          Math.abs(values.xAxis) > AxisTouchThreshold
        ) {
          values.state = ComponentState.TOUCHED;
        }
      }

      // Get and normalize Y axis value
      if (gamepadIndices.yAxis !== undefined && gamepad.axes.length > gamepadIndices.yAxis) {
        values.yAxis = gamepad.axes[gamepadIndices.yAxis];
        values.yAxis = values.yAxis < -1 ? -1 : values.yAxis;
        values.yAxis = values.yAxis > 1 ? 1 : values.yAxis;

        // If the state is still default, check if the yAxis makes it touched
        if (
          values.state === ComponentState.DEFAULT &&
          Math.abs(values.yAxis) > AxisTouchThreshold
        ) {
          values.state = ComponentState.TOUCHED;
        }
      }
    });

    callback(gamepadValues);
  });
};

export const useXRGamepadButton = (
  inputSource: XRInputSource,
  component: string,
  pressCallback: (values: GamepadValues) => void,
  releaseCallback: (values: GamepadValues) => void,
) => {
  const prevState = useRef(ComponentState.DEFAULT);

  useXRGamepadValues(inputSource, (values) => {
    const newState = values[component]?.state;

    if (!newState) {
      return;
    }

    if (prevState.current !== ComponentState.PRESSED && newState === ComponentState.PRESSED) {
      pressCallback(values);
    }

    if (prevState.current === ComponentState.PRESSED && newState !== ComponentState.PRESSED) {
      releaseCallback(values);
    }

    prevState.current = newState;
  });
};
