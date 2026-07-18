"use client";

import { useEffect } from "react";

declare global {
  interface Element {
    __ecoLinkPointerCaptureGuardInstalled?: boolean;
  }
}

export function PointerCaptureGuard() {
  useEffect(() => {
    if (Element.prototype.__ecoLinkPointerCaptureGuardInstalled) return;

    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.releasePointerCapture = function releasePointerCaptureSafely(pointerId: number) {
      try {
        if (typeof this.hasPointerCapture === "function" && !this.hasPointerCapture(pointerId)) {
          return;
        }
        originalReleasePointerCapture.call(this, pointerId);
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") return;
        throw error;
      }
    };

    Element.prototype.__ecoLinkPointerCaptureGuardInstalled = true;
  }, []);

  return null;
}
