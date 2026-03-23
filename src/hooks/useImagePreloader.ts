"use client";

import { useEffect, useRef } from "react";

/**
 * Preloads an array of image URLs into the browser cache.
 * Uses Image() objects so subsequent <img src="..."> hits the cache instantly.
 */
function preloadImages(urls: string[]) {
  for (const url of urls) {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }
}

/**
 * Preloads all unique party/allies images from the manifest on mount,
 * so stepping through the journey never waits for a cold fetch.
 */
export function usePreloadPartyImages(manifest: Record<string, Record<string, { image: string | null }>> | null) {
  const preloaded = useRef(false);

  useEffect(() => {
    if (!manifest || preloaded.current) return;
    preloaded.current = true;

    const urls = new Set<string>();
    for (const group of Object.values(manifest)) {
      for (const entry of Object.values(group)) {
        if (entry.image) urls.add(entry.image);
      }
    }

    // Stagger slightly so we don't compete with initial page resources
    const timer = setTimeout(() => preloadImages([...urls]), 500);
    return () => clearTimeout(timer);
  }, [manifest]);
}

/**
 * Preloads node scene images (thumbnails + photos) for the current step
 * and adjacent steps, so opening the SidePanel or clicking next is instant.
 */
export function usePreloadNodeImages(
  journeyEntries: { nodeId: string }[],
  selectedStep: number,
  nodeMap: Map<string, { thumbnail?: string; photos?: { src: string }[] }>,
) {
  const lastPreloadedStep = useRef(-1);

  useEffect(() => {
    if (selectedStep < 0 || selectedStep === lastPreloadedStep.current) return;
    lastPreloadedStep.current = selectedStep;

    const urls: string[] = [];

    // Preload current step + neighbors (prev, next, next+1)
    const stepsToPreload = [selectedStep - 1, selectedStep, selectedStep + 1, selectedStep + 2];
    for (const step of stepsToPreload) {
      if (step < 0 || step >= journeyEntries.length) continue;
      const node = nodeMap.get(journeyEntries[step].nodeId);
      if (!node) continue;

      if (node.thumbnail) urls.push(node.thumbnail);
      if (node.photos) {
        for (const photo of node.photos) {
          urls.push(photo.src);
        }
      }
    }

    preloadImages(urls);
  }, [selectedStep, journeyEntries, nodeMap]);
}
