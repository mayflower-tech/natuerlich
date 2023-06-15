/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/display-name */
import React, { ReactNode, RefObject, useRef, useState } from "react";
import { useCallback } from "react";
import { Group } from "three";

export type WhenFunction<P> = (
  ref: RefObject<Group>,
  set: (show: boolean) => void,
  props: P,
) => void;

export function VisibleGuard<P>(useWhen: WhenFunction<P>) {
  return ({ children, ...props }: { children?: ReactNode } & P) => {
    const ref = useRef<Group>(null);
    useWhen(
      ref,
      useCallback((show) => {
        if (ref.current != null) {
          ref.current.visible = show;
        }
      }, []),
      props as P,
    );
    return <group ref={ref}>{children}</group>;
  };
}

export function IncludeGuard<P>(useWhen: WhenFunction<P>) {
  return ({ children, ...props }: { children?: ReactNode } & P) => {
    const [show, setShow] = useState(true);
    const ref = useRef<Group>(null);
    useWhen(ref, setShow, props as P);
    return <group ref={ref}>{show ?? children}</group>;
  };
}

export * from "./facing-camera.js";
export * from "./session-mode.js";
