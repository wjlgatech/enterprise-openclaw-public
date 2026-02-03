/**
 * Local plugin type definitions
 * These should match the common plugin interface
 */

export interface EnterprisePlugin {
  metadata: {
    name: string;
    version: string;
    description: string;
  };
  register(api: OpenClawPluginApi): Promise<void>;
  onGatewayStart?(): Promise<void>;
  onGatewayStop?(): Promise<void>;
}

export interface OpenClawPluginApi {
  config: any;
  registerMethod(name: string, handler: (...args: any[]) => Promise<any>): void;
  log(message: string): void;
}
