export type CommandHandler = (args?: any) => Promise<void> | void;

export interface CommandDefinition {
  id: string;
  title: string;
  category: string;
  handler: CommandHandler;
}

export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();

  register(command: CommandDefinition) {
    this.commands.set(command.id, command);
  }

  async execute(id: string, args?: any): Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`Command not found: ${id}`);
      return;
    }
    await cmd.handler(args);
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }
}
