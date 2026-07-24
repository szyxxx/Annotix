export type FeatureFlag = 
  | "ai-auto-label" 
  | "training" 
  | "cloud-sync" 
  | "marketplace" 
  | "experimental-canvas";

export class FeatureFlagRegistry {
  private flags = new Map<FeatureFlag, boolean>();

  constructor() {
    // Default flags - in a real app, this might be loaded from a settings file or environment
    this.flags.set("ai-auto-label", false);
    this.flags.set("training", false);
    this.flags.set("cloud-sync", false);
    this.flags.set("marketplace", false);
    this.flags.set("experimental-canvas", false);
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags.get(flag) ?? false;
  }

  enable(flag: FeatureFlag): void {
    this.flags.set(flag, true);
  }

  disable(flag: FeatureFlag): void {
    this.flags.set(flag, false);
  }
}
