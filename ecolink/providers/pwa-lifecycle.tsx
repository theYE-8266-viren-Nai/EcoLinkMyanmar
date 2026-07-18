"use client";

import { useEffect } from "react";

function setNetworkDataset() {
  document.documentElement.dataset.network = navigator.onLine ? "online" : "offline";
}

export function PwaLifecycle() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    setNetworkDataset();
    window.addEventListener("online", setNetworkDataset);
    window.addEventListener("offline", setNetworkDataset);

    const registerServiceWorker = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };

    if (
      process.env.NODE_ENV === "production"
      && "serviceWorker" in navigator
      && window.isSecureContext
    ) {
      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
      }
    }

    return () => {
      window.removeEventListener("online", setNetworkDataset);
      window.removeEventListener("offline", setNetworkDataset);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
