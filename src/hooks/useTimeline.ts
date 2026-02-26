"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CampaignData, TimelineNode } from "@/types/timeline";

export function useTimeline() {
  const [data, setData] = useState<CampaignData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/timeline.json")
      .then((res) => res.json())
      .then((json: CampaignData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load timeline data:", err);
        setLoading(false);
      });
  }, []);

  const sortedNodes = useMemo(() => {
    if (!data) return [];
    // Preserve array order from JSON (the authored order is the timeline order)
    return [...data.nodes];
  }, [data]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !sortedNodes.length) return null;
    return sortedNodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, sortedNodes]);

  const selectedIndex = useMemo(() => {
    if (!selectedNode) return -1;
    return sortedNodes.findIndex((n) => n.id === selectedNode.id);
  }, [selectedNode, sortedNodes]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const goToNext = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= sortedNodes.length - 1) return;
    setSelectedNodeId(sortedNodes[selectedIndex + 1].id);
  }, [selectedIndex, sortedNodes]);

  const goToPrevious = useCallback(() => {
    if (selectedIndex <= 0) return;
    setSelectedNodeId(sortedNodes[selectedIndex - 1].id);
  }, [selectedIndex, sortedNodes]);

  return {
    data,
    loading,
    sortedNodes,
    selectedNode,
    selectedIndex,
    selectNode,
    goToNext,
    goToPrevious,
    hasNext: selectedIndex >= 0 && selectedIndex < sortedNodes.length - 1,
    hasPrevious: selectedIndex > 0,
  };
}
