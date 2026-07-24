export interface ProviderRegistration {
  id: string;
  name: string;
  priority: number; // Higher number = higher priority
  handler: any; // The actual class/function that implements the capability
}

export type CapabilityType = "segmentation" | "detection" | "export" | "import";

export class CapabilityRegistry {
  private providers = new Map<CapabilityType, ProviderRegistration[]>();

  register(capability: CapabilityType, provider: ProviderRegistration): void {
    const existing = this.providers.get(capability) || [];
    existing.push(provider);
    
    // Sort by priority descending
    existing.sort((a, b) => b.priority - a.priority);
    this.providers.set(capability, existing);
  }

  getBestProvider(capability: CapabilityType): ProviderRegistration | null {
    const list = this.providers.get(capability);
    if (!list || list.length === 0) return null;
    return list[0];
  }

  getAllProviders(capability: CapabilityType): ProviderRegistration[] {
    return this.providers.get(capability) || [];
  }
}
