export interface ShortcutBinding {
  keys: string; // e.g. "Ctrl+Shift+P"
  commandId: string;
}

export class ShortcutRegistry {
  private bindings = new Map<string, string>(); // keys -> commandId

  bind(keys: string, commandId: string) {
    this.bindings.set(keys.toLowerCase(), commandId);
  }

  getCommandId(keys: string): string | undefined {
    return this.bindings.get(keys.toLowerCase());
  }
}
