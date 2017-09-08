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

/**
 * Key distribution: keys that shall be distributed.
 *
 */
export interface SecurityKeyExchange {
  id: boolean;   /**< Identity Resolving Key and Identity Address Information. */
  enc: boolean;  /**< Long Term Key and Master Identification. */
  sign: boolean; /**< Connection Signature Resolving Key. */
  link: boolean; /**< Derive the Link Key from the LTK. */
}

export interface SecurityParameters {
  bond: boolean;
  mitm: boolean;
  lesc: boolean;
  keypress: boolean;
  io_caps: string; // FIXME: replace this with enum
  oob: boolean;
  min_key_size: number;
  max_key_size: number;
  kdist_own: SecurityKeyExchange;
  kdist_peer: SecurityKeyExchange;
}

export interface SecurityKeys {
  enc_key: string;
  id_key: string;
  sign_key: string;
  pk: string;
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
  connect(deviceAddress: string | Address, options: ConnectionOptions, callback?: (err: any) => void): void;
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
  
  authenticate(deviceInstanceId: string, secParams: any, callback?: (err: any) => void): void;
  replySecParams(deviceInstanceId: string, secStatus: number, secParams: SecurityParameters | null, secKeys: SecurityKeys | null, callback?: (err: any, keyset?: any) => void): void;
  replyLescDhkey(deviceInstanceId: string, key: any, callback?: (err: any) => void): void;
  replyAuthKey(deviceInstanceId: string, keyType: any, key: any, callback?: (err: any) => void): void;
  notifyKeypress(deviceInstanceId: string, notificationType: any, callback?: (err: any) => void): void;
  getLescOobData(deviceInstanceId: string, ownPublicKey: string, callback?: (err: any) => void): void;
  setLescOobData(deviceInstanceId: string, ownOobData: string, peerOobData: string, callback?: (err: any) => void): void;
  encrypt(deviceInstanceId: string, masterId: any, encInfo: any, callback?: (err: any) => void): void;
  secInfoReply(deviceInstanceId: string, encInfo: any, idInfo:any, signInfo: any, callback?: (err: any) => void): void;
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

export class KeyPair {
  sk: string;
  pk: string;
}

export class PublicKey {
  pk: string;
}

export class SharedSecret {
  ss: string;
}

export class Security {
  generateKeyPair(): KeyPair;
  generatePublicKey(privateKey: string): PublicKey;
  generateSharedSecred(privateKey: string, publicKey: string): SharedSecret;
}

export class DfuTransportParameters {
  adapter: Adapter;
  targetAddress: string;
  targetAddressType: string;
  prnValue?: number;
  mtuSize?: number;
}

export class Dfu extends EventEmitter {
  constructor(transportType: string, transportParameters: DfuTransportParameters);
  performDfu(zipFilePath: string, callback: (err?: any, abort?: boolean) => void): void;
  abort(): void;
}

export function getFirmwarePath(family: string): string;
export function getFirmwareString(family: string): string;

export const driver: any;
