import React from "react";
import { useInputSources } from "../react/listeners.js";
import { GrabHand, PointerHand, TeleportHand, TouchHand } from "./index.js";
import { getInputSourceId } from "../index.js";
import { ColorRepresentation, Event, Vector3 } from "three";
import { XIntersection } from "@coconut-xr/xinteraction";
import { ThreeEvent } from "@react-three/fiber";

export type HandType = "pointer" | "grab" | "teleport" | "touch";

export function Hands({
  type = "pointer",
  ...props
}: {
  type?: HandType;
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
}) {
  const inputSources = useInputSources();
  const Hand = selectHand(type);
  return (
    <>
      {inputSources
        .filter((inputSource) => inputSource.hand != null)
        .map((inputSource) => (
          <Hand
            hand={inputSource.hand!} //we filtered for inputSource with hands so we can be sure here
            id={getInputSourceId(inputSource)}
            inputSource={inputSource}
            key={getInputSourceId(inputSource)}
            {...props}
          />
        ))}
    </>
  );
}

function selectHand(type: HandType) {
  switch (type) {
    case "grab":
      return GrabHand;
    case "pointer":
      return PointerHand;
    case "teleport":
      return TeleportHand;
    case "touch":
      return TouchHand;
  }
}
