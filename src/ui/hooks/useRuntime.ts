import { useRuntimeInternal } from "../components/providers/RuntimeProvider";

export const useRuntime = () => {
  const runtime = useRuntimeInternal();
  if (!runtime) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return runtime;
};
