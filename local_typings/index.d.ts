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

export interface Address {
  address: string;
  type: string; // TODO : Should replace this with enum
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
  address: Address;
  addressType: string;
  name: string;
  available: boolean;
  scanning: boolean;
  advertising: boolean;
  connecting: boolean;
}

export class Device {
  instanceId: string;
  address: string;
  role: string;
  connectionHandle: string;
  name: string;
  rssi: number;
  adData: any;
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
  driver: any;
  state: AdapterState;
  open(options?: AdapterOpenOptions, callback?: (err: any) => void): void;
  close(callback?: (err: any) => void): void;
  startScan(options: ScanParameters, callback?: (err: any) => void): void;
  stopScan(callback?: (err: any) => void): void;
  connect(deviceAddress: string, options: ConnectionOptions, callback?: (err: any) => void): void;
  getService(serviceInstanceId: string, callback?: (err: any, service: Service) => void): void;
  getServices(deviceInstanceId: string, callback?: (err: any, services: Array<Service>) => void): void;
  getCharacteristic(charInstanceId: string): Characteristic;
  getCharacteristics(serviceInstanceId: string, callback?: (err: any, services: Array<Characteristic>) => void): void;
  getDescriptor(descriptorId: string): Descriptor;
  getDescriptors(characteristicId: string, callback?: (err?: any, descriptors?: Array<Descriptor>) => void): void;
  readCharacteristicValue(charInstanceId: string, callback?: (err: any, value: Array<number>) => void): void;
  readDescriptorValue(descriptorId: string, callback?: (err: any, value: Array<number>) => void): void;
  disconnect(deviceInstanceId: string, callback?: (err: any) => void): void;
  getState(callback: (err: any, state: AdapterState) => void): void;
  setName(name: string, callback?: (err: any) => void): void;
  cancelConnect(callback?: (err: any) => void): void;
  getDevices(): Device[];
  getDevice(deviceInstanceId: string): Device;
  updateConnectionParameters(deviceInstanceId: string, options: ConnectionParameters, callback?: (err: any) => void): void;
  rejectConnParams(deviceInstanceId: string, callback?: (err: any) => void): void;
  requestAttMtu(deviceInstanceId: string, mtu: number, callback?: (err: any, value: number) => void): void;
  getCurrentAttMtu(deviceInstanceId: string): number;
}

export class AdapterFactory extends EventEmitter {
  static getInstance(): AdapterFactory;
  getAdapters(callback?: (err: any, adapters: Adapter[]) => void);
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
