import React from "react";
import { useInputSources } from "../react/listeners.js";
import { GrabController, PointerController, TeleportController } from "./index.js";
import { getInputSourceId } from "../index.js";
import { ColorRepresentation, Event, Vector3 } from "three";
import { XIntersection } from "@coconut-xr/xinteraction";
import { ThreeEvent } from "@react-three/fiber";

export type ControllerType = "pointer" | "grab" | "teleport";

/**
 * default controllers of either type "pointer", "grab", or "teleport"
 */
export function Controllers({
  type = "pointer",
  ...props
}: {
  type?: ControllerType;
  onTeleport?: (point: Vector3) => void;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
  cursorColor?: ColorRepresentation;
  cursorPressColor?: ColorRepresentation;
  cursorOpacity?: number;
  cursorSize?: number;
  cursorVisible?: boolean;
  rayColor?: ColorRepresentation;
  rayPressColor?: ColorRepresentation;
  raySize?: number;
  onPointerDownMissed?: ((event: ThreeEvent<Event>) => void) | undefined;
  onPointerUpMissed?: ((event: ThreeEvent<Event>) => void) | undefined;
  onClickMissed?: ((event: ThreeEvent<Event>) => void) | undefined;
  pressSoundUrl?: string;
  pressSoundVolume?: number;
}) {
  const inputSources = useInputSources();
  const Controller = selectController(type);
  return (
    <>
      {inputSources
        .filter((inputSource) => inputSource.hand == null)
        .map((inputSource) => (
          <Controller
            id={getInputSourceId(inputSource)}
            inputSource={inputSource}
            key={getInputSourceId(inputSource)}
            {...props}
          />
        ))}
    </>
  );
}

function selectController(type: ControllerType) {
  switch (type) {
    case "grab":
      return GrabController;
    case "pointer":
      return PointerController;
    case "teleport":
      return TeleportController;
  }
}
