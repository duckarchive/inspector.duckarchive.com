import { Resource } from "@prisma/client";
import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

type ResourcesState = {
  resources: Record<Resource["id"], Resource>;
};

const ResourcesContext = createContext<ResourcesState | undefined>(undefined);

export const ResourcesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [resources, setResources] = useState<ResourcesState["resources"]>({});

  useEffect(() => {
    const fetchResources = async () => {
      const response = await fetch("/api/resources");
      const data = await response.json();
      const hash: ResourcesState["resources"] = {};
      for (const resource of data) {
        hash[resource.id] = resource;
      }
      setResources(hash);
    };

    fetchResources();
  }, []);

  return <ResourcesContext.Provider value={{ resources }}>{children}</ResourcesContext.Provider>;
};

export const useResources = () => {
  const context = useContext(ResourcesContext);
  if (context === undefined) {
    throw new Error("useResources must be used within a ResourcesProvider");
  }
  return context.resources;
};
