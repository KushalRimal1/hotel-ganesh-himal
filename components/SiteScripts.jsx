'use client';

import Script from 'next/script';
import { useState } from 'react';

export default function SiteScripts() {
  const [hotspotReady, setHotspotReady] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [plannerReady, setPlannerReady] = useState(false);
  return <>
    <Script src="/hotspot.js?v=next-2" strategy="afterInteractive" onReady={() => setHotspotReady(true)} onError={() => setHotspotReady(true)} />
    <Script src="/motion.js?v=next-7" strategy="afterInteractive" onReady={() => setMotionReady(true)} onError={() => setMotionReady(true)} />
    <Script src="/gallery-policy.js?v=next-1" strategy="afterInteractive" onReady={() => setGalleryReady(true)} onError={() => setGalleryReady(true)} />
    <Script src="/stay-enquiry.js?v=next-1" strategy="afterInteractive" onReady={() => setPlannerReady(true)} onError={() => setPlannerReady(true)} />
    {hotspotReady && motionReady && galleryReady && plannerReady && <Script src="/script.js?v=next-18" strategy="afterInteractive" />}
  </>;
}
