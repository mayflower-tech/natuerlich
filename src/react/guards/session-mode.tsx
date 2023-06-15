import { useEffect, RefObject } from "react";
import { Group } from "three";
import { ExtendedXRSessionMode } from "../state.js";
import { IncludeGuard, useXR, VisibleGuard } from "../index.js";

export function useIsInSessionMode(
  ref: RefObject<Group>,
  set: (show: boolean) => void,
  {
    allow,
    deny,
  }: {
    allow?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
    deny?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
  },
) {
  useEffect(() => {
    const update = (mode: ExtendedXRSessionMode) => {
      if (ref.current == null) {
        return;
      }
      if (deny != null) {
        set(Array.isArray(deny) ? !deny.includes(mode) : deny != mode);
        return;
      }
      if (allow != null) {
        set(Array.isArray(allow) ? allow.includes(mode) : allow === mode);
        return;
      }
    };
    update(useXR.getState().mode);
    return useXR.subscribe((state) => update(state.mode));
  }, [allow, deny]);
}

export const VisibleWhenInSessionMode = VisibleGuard(useIsInSessionMode);
export const IncludeWhenInSessionMode = IncludeGuard(useIsInSessionMode);
