import { useRef } from "react";
import { usePersistedAnchor } from "../dist/react/anchor.js";
import { Mesh, Vector3 } from "three";
import { isXIntersection } from "@coconut-xr/xinteraction";
import { useFrame, useThree } from "@react-three/fiber";

export function AnchorObject() {
  const [anchor, createAnchor] = usePersistedAnchor("drag-cube-anchor");
  const xr = useThree((state) => state.gl.xr);
  const ref = useRef<Mesh>(null);
  useFrame((state, delta, frame: XRFrame) => {
    if (downState.current != null) {
      //we are currently modifying the position by dragging
      return;
    }
    const referenceSpace = xr.getReferenceSpace();
    if (anchor == null || ref.current == null || referenceSpace == null || frame == null) {
      return;
    }
    const pose = frame.getPose(anchor.anchorSpace, referenceSpace);
    if (pose == null) {
      return;
    }
    const { position, orientation } = pose.transform;
    ref.current.position.set(position.x, position.y, position.z);
    ref.current.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
  });
  const downState = useRef<{
    pointerId: number;
    pointToObjectOffset: Vector3;
  }>();
  return (
    <mesh
      scale={0.1}
      onPointerDown={(e) => {
        if (ref.current != null && downState.current == null && isXIntersection(e)) {
          e.stopPropagation();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          downState.current = {
            pointerId: e.pointerId,
            pointToObjectOffset: ref.current.position.clone().sub(e.point),
          };
        }
      }}
      onPointerUp={(e) => {
        if (downState.current?.pointerId != e.pointerId) {
          return;
        }
        downState.current = undefined;
        if (ref.current == null) {
          return;
        }
        createAnchor(ref.current.position, ref.current.quaternion);
      }}
      onPointerLeave={(e) => {
        if (downState.current?.pointerId == e.pointerId) {
          downState.current = undefined;
        }
      }}
      onPointerMove={(e) => {
        if (
          ref.current == null ||
          downState.current == null ||
          e.pointerId != downState.current.pointerId ||
          !isXIntersection(e)
        ) {
          return;
        }

        ref.current.position.copy(downState.current.pointToObjectOffset).add(e.point);
      }}
      ref={ref}
    >
      <boxGeometry />
      <meshBasicMaterial color="yellow" toneMapped={false} />
    </mesh>
  );
}
