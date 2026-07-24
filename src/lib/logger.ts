import { eventBus } from "../core/eventBus";

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

class Logger {
  private level: LogLevel = LogLevel.DEBUG;

  constructor() {
    // Subscribe to key events for automatic logging
    eventBus.subscribe("Project", "Opened", (msg) => this.info(`Project opened: ${msg.payload?.name}`));
    eventBus.subscribe("AI", "InferenceStarted", (msg) => this.info(`Inference started for ${msg.payload?.image}`));
    eventBus.subscribe("AI", "InferenceFinished", (msg) => this.info(`Inference finished in ${msg.payload?.durationMs}ms`));
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(msg: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) console.debug(`[Annotix:DEBUG] ${msg}`, ...args);
  }

  info(msg: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) console.info(`[Annotix:INFO] ${msg}`, ...args);
  }

  warn(msg: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) console.warn(`[Annotix:WARN] ${msg}`, ...args);
  }

  error(msg: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) console.error(`[Annotix:ERROR] ${msg}`, ...args);
  }
}

export const logger = new Logger();
