import React, { ReactNode } from "react";
import { useFocusState } from "../index.js";

/**
 * guard that only makes its content visible when the session is not blurred or when not in a session
 */
export function VisibilityFocusStateGuard({ children }: { children?: ReactNode }) {
  const focusState = useFocusState();
  return <group visible={focusState == null || focusState === "visible"}>{children}</group>;
}

/**
 * guard that only includes content when the session is not blurred or when not in a session
 */
export function FocusStateGuard({ children }: { children?: ReactNode }) {
  const focusState = useFocusState();
  if (focusState != "visible" && focusState != null) {
    return null;
  }
  return <>{children}</>;
}
