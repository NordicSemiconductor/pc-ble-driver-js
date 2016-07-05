export interface AdapterOpenOptions {
  baudRate?: number;
  parity?: string;
  flowControl?: string;
  eventInterval?: number;
  logLevel?: string;
  retransmissionInterval?: number;
  responseTimeout?: number;
  enableBLE?: boolean;
}

export interface ScanParameters {
  active: boolean;
  interval: number;
  window: number;
  timeout: number;
}

export interface ConnectionParameters {
  min_conn_interval: number;
  max_conn_interval: number;
  slave_latency: number;
  conn_sup_timeout: number;
}

export interface ConnectionOptions {
  scanParams: ScanParameters;
  connParams: ConnectionParameters;
}

export class AdapterState {
  instanceId: string;
  port: string;
  serialNumber: string;
  address: string;
}

export class Device {
  instanceId: string;
  address: string;
  role: string;
  connectionHandle: string;
  name: string;
}

export class Service {
  instanceId: string;
  deviceInstanceId: string;
  type: string;
  uuid: string;
}

export class Characteristic {
  instanceId: string;
  serviceInstanceId: string;
  handle: string;
  uuid: string;
}

export class Descriptor {
  instanceId: string;
  characteristicInstanceId: string;
}

interface CallbackFunc {
  (err: any): void;
}

interface ServicesCallbackFunc {
  (err: any, services: Array<Service>): void;
}

interface CharacteristicCallbackFunc {
  (err: any, services: Array<Characteristic>): void;
}

interface ReadCharacteristicCallbackFunc {
  (err: any, value: Array<number>): void;
}

interface StateCallbackFunc {
  (err: any, state: AdapterState): void;
}

interface AdapterFactoryCallbackFunc {
  (err: any, adapters: Adapter[]): void;
}

// This is the declaration of EventEmitter taken
// from node.d.ts file
declare class EventEmitter {
  addListener(event: string, listener: Function): this;
  on(event: string, listener: Function): this;
  once(event: string, listener: Function): this;
  removeListener(event: string, listener: Function): this;
  removeAllListeners(event?: string): this;
  setMaxListeners(n: number): this;
  getMaxListeners(): number;
  listeners(event: string): Function[];
  emit(event: string, ...args: any[]): boolean;
  listenerCount(type: string): number;
}

export class Adapter extends EventEmitter {
  instanceId: string;
  state: AdapterState;
  open(options?: AdapterOpenOptions, callback?: CallbackFunc): void;
  close(callback?: CallbackFunc): void;
  startScan(options: ScanParameters, callback?: CallbackFunc): void;
  stopScan(callback?: CallbackFunc): void;
  connect(deviceAddress: string, options: ConnectionOptions, callback?: CallbackFunc): void;
  getServices(deviceInstanceId: string, callback?: ServicesCallbackFunc): void;
  getCharacteristics(serviceInstanceId: string, callback?: CharacteristicCallbackFunc): void;
  readCharacteristicValue(charInstanceId: string, callback?: ReadCharacteristicCallbackFunc): void;
  disconnect(deviceInstanceId: string, callback?: CallbackFunc): void;
  getState(callback: StateCallbackFunc): void;
  setName(name: string, callback?: CallbackFunc): void;
}

export class AdapterFactory extends EventEmitter {
  static getInstance(): AdapterFactory;
  getAdapters(callback?: AdapterFactoryCallbackFunc);
}

export class ServiceFactory {
  createService(uuid: string, serviceType: string);
  createCharacteristic(service: Service, uuid: string, value: any, properties: any, options: any);
  createDescriptor(characteristic: Characteristic, uuid: string, value: string, options: string);
}

export const api: {
  AdapterFactory: typeof AdapterFactory;
  Adapter: typeof Adapter;
  AdapterState: typeof AdapterState;
  Characteristic: typeof Characteristic;
  Device: typeof Device;
  Service: typeof Service;
  Descriptor: typeof Descriptor;
  ServiceFactory: typeof ServiceFactory;
};

export const driver: any;
