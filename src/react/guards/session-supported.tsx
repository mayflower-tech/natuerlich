import React, { ReactNode } from "react";
import { useSessionSupported } from "../index.js";

/**
 * guard that only makes its content visible when the session mode is supported
 */
export function VisibilitySessionSupportedGuard({
  children,
  mode,
}: {
  children?: ReactNode;
  mode: XRSessionMode;
}) {
  const supported = useSessionSupported(mode);
  return <group visible={supported}>{children}</group>;
}

/**
 * guard that only includes content when the session mode is supported
 */
export function SessionSupportedGuard({
  children,
  mode,
}: {
  children?: ReactNode;
  mode: XRSessionMode;
}) {
  const supported = useSessionSupported(mode);
  if (!supported) {
    return null;
  }
  return <>{children}</>;
}
