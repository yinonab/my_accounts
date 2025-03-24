export interface BackgroundServicePlugin {
  startService(): Promise<void>;
  stopService(): Promise<void>;
}
