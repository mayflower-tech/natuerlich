import { ReactNode } from "react";
import { ExtendedXRSessionMode } from "../state.js";
import { useXR } from "../index.js";
import React from "react";

export function useIsInSessionMode(
  allow?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>,
  deny?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>,
) {
  const mode = useXR((state) => state.mode);
  if (deny != null) {
    return Array.isArray(deny) ? !deny.includes(mode) : deny != mode;
  }
  if (allow != null) {
    return Array.isArray(allow) ? allow.includes(mode) : allow === mode;
  }
  return true;
}

export function VisibleWhenInSessionMode({
  children,
  allow,
  deny,
}: {
  children?: ReactNode;
  allow?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
  deny?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
}) {
  const visible = useIsInSessionMode(allow, deny);
  return <group visible={visible}>{children}</group>;
}

export function IncludeWhenInSessionMode({
  children,
  allow,
  deny,
}: {
  children?: ReactNode;
  allow?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
  deny?: ExtendedXRSessionMode | ReadonlyArray<ExtendedXRSessionMode>;
}) {
  const visible = useIsInSessionMode(allow, deny);
  return visible ? <>{children}</> : null;
}
