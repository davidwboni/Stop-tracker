import React, { useEffect, useState } from "react";

const AdBanner = ({ adSlot, style }) => {
  const [adLoaded, setAdLoaded] = useState(true);

  useEffect(() => {
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        window.adsbygoogle.push({});
      } catch (error) {
        console.error("Ad failed to load:", error);
        setAdLoaded(false);
      }
    }
  }, []);

  return (
    <div className="ad-banner flex justify-center items-center py-4">
      {adLoaded ? (
        <ins
          className="adsbygoogle block"
          style={{ display: "block", ...style, minHeight: "90px" }}
          data-ad-client="ca-pub-9187057608251953"
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          aria-label="Advertisement"
        ></ins>
      ) : (
        <div
          className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-center p-4 rounded-md"
          aria-label="Ad Placeholder"
        >
          <p>Advertisement failed to load. Please check your connection.</p>
        </div>
      )}
    </div>
  );
};

export default AdBanner;