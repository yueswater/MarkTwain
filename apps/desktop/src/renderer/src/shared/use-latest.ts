import { useRef, type MutableRefObject } from "react";

/** A ref that always holds the value of the last render, for code that runs later and must not use an old value. */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
