import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../contexts/AuthContext";

const AdBanner = ({ adSlot, style }) => {
  const { user } = useAuth();
  const [failed, setFailed] = useState(false);

  const enabled = process.env.REACT_APP_ENABLE_ADS === "true";
  const client = process.env.REACT_APP_ADSENSE_CLIENT || "ca-pub-9187057608251953";
  const slot = adSlot || process.env.REACT_APP_ADSENSE_DASHBOARD_SLOT;
  const isPro = user?.role === "pro";
  const shouldShow = enabled && !isPro && !Capacitor.isNativePlatform() && Boolean(client && slot);

  useEffect(() => {
    if (!shouldShow) return undefined;

    const pushAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.warn("Ad slot could not load:", error);
        setFailed(true);
      }
    };

    const existing = document.querySelector('script[data-verso-adsense="true"]');
    if (existing) {
      if (existing.dataset.loaded === "true") pushAd();
      else existing.addEventListener("load", pushAd, { once: true });
      return () => existing.removeEventListener("load", pushAd);
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.dataset.versoAdsense = "true";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      pushAd();
    }, { once: true });
    script.addEventListener("error", () => setFailed(true), { once: true });
    document.head.appendChild(script);

    return undefined;
  }, [shouldShow, client, slot]);

  if (!shouldShow || failed) return null;

  return (
    <div className="ad-banner flex justify-center items-center py-3" aria-label="Advertisement">
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block", minHeight: "90px", ...style }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner;
