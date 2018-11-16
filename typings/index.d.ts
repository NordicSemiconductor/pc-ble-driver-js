import { EventEmitter } from 'events';

export declare interface Error {
  message: string;
  description: string;
}

export declare interface AdapterOpenOptions {
  baudRate?: number;
  parity?: string;
  flowControl?: string;
  eventInterval?: number;
  logLevel?: string;
  retransmissionInterval?: number;
  responseTimeout?: number;
  enableBLE?: boolean;
}

export declare interface AdapterStatus {
  id: number;
  name: string;
  message: string;
  timestamp: string;
}

export declare interface Address {
  address: string;
  type: string;
}

export declare interface ScanParameters {
  active: boolean;
  interval: number;
  window: number;
  timeout: number;
}

export declare interface ConnectionParameters {
  minConnectionInterval?: number;
  min_conn_interval?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
  maxConnectionInterval?: number;
  max_conn_interval?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
  slaveLatency?: number;
  slave_latency?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
  connectionSupervisionTimeout?: number;
  conn_sup_timeout?: number; // FIXME: https://github.com/NordicSemiconductor/pc-ble-driver-js/issues/76
}

/**
 * Key distribution: keys that shall be distributed.
 *
 */
export declare interface SecurityKeyExchange {
  id: boolean;   /**< Identity Resolving Key and Identity Address Information. */
  enc: boolean;  /**< Long Term Key and Master Identification. */
  sign: boolean; /**< Connection Signature Resolving Key. */
  link: boolean; /**< Derive the Link Key from the LTK. */
}

export declare interface SecurityParameters {
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

export declare interface SecurityKeys {
  enc_key: string;
  id_key: string;
  sign_key: string;
  pk: string;
}

export declare interface AuthParameters {
  securityMode: number;
  securityLevel: number;
}

export declare interface AuthStatus {
  auth_status: number;
  auth_status_name: string;
  error_src: number;
  error_src_name: string;
  bonded: boolean;
  sm1_levels: number;
  sm2_levels: number;
  kdist_own: any; // FIXME:
  kdist_peer: any; // FIXME:
  keyset: any; // FIXME:
}

export declare interface ConnectionOptions {
  scanParams: ScanParameters;
  connParams: ConnectionParameters;
}

export declare interface AdapterFirmwareVersion {
  version_number: number;
  company_id: number;
  subversion_number: number;
}

export declare interface AdapterState {
  instanceId: string;
  port: string;
  serialNumber: string;
  address: Address;
  addressType: string;
  name: string;
  available: boolean;
  bleEnabled: boolean;
  scanning: boolean;
  advertising: boolean;
  connecting: boolean;
  firmwareVersion: AdapterFirmwareVersion;
}

export declare interface Device {
  instanceId: string;
  address: string;
  addressType: string;
  role: string;
  connectionHandle: number;
  connected: boolean;
  txPower: number;
  minConnectionInterval:number;
  maxConnectionInterval:number;
  slaveLatency:number;
  connectionSupervisionTimeout:number;
  paired:boolean;
  name: string;
  rssi: number;
  rssi_level: number;
  advType: string;
  adData: any;
  services: Array<any>;
  flags: any;
  scanResponse: any;
  time: Date;
}

export declare interface Service {
  instanceId: string;
  deviceInstanceId: string;
  type: string;
  uuid: string;
}

export declare interface CharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  write_wo_resp: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  auth_signed_wr: boolean;
}

export declare interface CharacteristicExtProperties extends CharacteristicProperties {
  reliable_wr: boolean;
  wr_aux: boolean;
}

export declare interface Characteristic {
  instanceId: string;
  serviceInstanceId: string;
  declarationHandle: number;
  valueHandle: number;
  uuid: string;
  value: Array<number>;
  properties: CharacteristicProperties;
}

export declare interface Descriptor {
  instanceId: string;
  characteristicInstanceId: string;
  uuid: string;
  name: string;
  handle: number;
  value: Array<number>;
}

declare class Adapter extends EventEmitter {
  instanceId: string;
  driver: any;
  state: AdapterState;

  open(options?: AdapterOpenOptions, callback?: (err: any) => void): void;
  close(callback?: (err: any) => void): void;
  enableBLE(options: any, callback?: (err: any) => void): void; // FIXME: define options
  startScan(options: ScanParameters, callback?: (err: any) => void): void;
  stopScan(callback?: (err: any) => void): void;

  connect(deviceAddress: string | Address, options: ConnectionOptions, callback?: (err: any) => void): void;
  cancelConnect(callback?: (err: any) => void): void;
  disconnect(deviceInstanceId: string, callback?: (err: any) => void): void;

  getState(callback: (err: any, state: AdapterState) => void): void;
  setName(name: string, callback?: (err: any) => void): void;
  getDevices(): Device[];
  getDevice(deviceInstanceId: string): Device;

  updateConnectionParameters(deviceInstanceId: string, options: ConnectionParameters, callback?: (err: any) => void): void;
  rejectConnParams(deviceInstanceId: string, callback?: (err: any) => void): void;
  requestAttMtu(deviceInstanceId: string, mtu: number, callback?: (err: any, value: number) => void): void;
  getCurrentAttMtu(deviceInstanceId: string): number|undefined;

  getService(serviceInstanceId: string, callback?: (err: any, service: Service) => void): Service;
  getServices(deviceInstanceId: string, callback?: (err: any, services: Array<Service>) => void): void;
  getCharacteristic(characteristicId: string): Characteristic;
  getCharacteristics(serviceInstanceId: string, callback?: (err: any, services: Array<Characteristic>) => void): void;
  getDescriptor(descriptorId: string): Descriptor;
  getDescriptors(characteristicId: string, callback?: (err?: any, descriptors?: Array<Descriptor>) => void): void;
  readCharacteristicValue(characteristicId: string, callback?: (err: any, bytesRead: Array<number>) => void): void;
  writeCharacteristicValue(characteristicId: string, value: Array<number>, ack: boolean, callback?: (error: Error) => void): void;
  readDescriptorValue(descriptorId: string, callback?: (err: any, value: Array<number>) => void): void;
  writeDescriptorValue(descriptorId: string, value: Array<number>, ack: boolean, callback?: (error: Error) => void): void;

  authenticate(deviceInstanceId: string, secParams: any, callback?: (err: any) => void): void;
  replySecParams(deviceInstanceId: string, secStatus: number, secParams: SecurityParameters | null, secKeys: SecurityKeys | null, callback?: (err: any, keyset?: any) => void): void;
  replyLescDhkey(deviceInstanceId: string, key: any, callback?: (err: any) => void): void;
  replyAuthKey(deviceInstanceId: string, keyType: any, key: any, callback?: (err: any) => void): void;
  notifyKeypress(deviceInstanceId: string, notificationType: any, callback?: (err: any) => void): void;
  getLescOobData(deviceInstanceId: string, ownPublicKey: string, callback?: (err: any) => void): void;
  setLescOobData(deviceInstanceId: string, ownOobData: string, peerOobData: string, callback?: (err: any) => void): void;
  encrypt(deviceInstanceId: string, masterId: any, encInfo: any, callback?: (err: any) => void): void;
  secInfoReply(deviceInstanceId: string, encInfo: any, idInfo: any, signInfo: any, callback?: (err: any) => void): void;

  on(event: 'secParamsRequest', listener: (device: Device, peer_params: SecurityParameters) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'stateChanged', listener: (adapterState: AdapterState) => void): this;
  on(event: 'warning', listener: (warning: Error) => void): this;
  on(event: 'opened', listener: (adapter: Adapter) => void): this;
  on(event: 'closed', listener: (adapter: Adapter) => void): this;
  on(event: 'status', listener: (status: AdapterStatus) => void): this;
  on(event: 'logMessage', listener: (severity: string, message: string) => void): this;
  on(event: 'deviceConnected', listener: (device: Device) => void): this;
  on(event: 'deviceDisconnected', listener: (device: Device, reason_name: string, reason: string) => void): this;
  on(event: 'connParamUpdate', listener: (device: Device, connectionParameters: ConnectionParameters) => void): this;
  on(event: 'connSecUpdate', listener: (device: Device, conn_sec: AuthParameters) => void): this;
  on(event: 'securityChanged', listener: (device: Device, authParameters: AuthParameters) => void): this;
  on(event: 'authStatus', listener: (device: Device, status: AuthStatus) => void): this;
  on(event: 'passkeyDisplay', listener: (device: Device, matchRequest: number, passkey: string) => void): this;
  on(event: 'authKeyRequest', listener: (device: Device, keyType: string) => void): this;
  on(event: 'keyPressed', listener: (device: Device, keyPressNotificationType: string) => void): this;
  on(event: 'lescDhkeyRequest', listener: (device: Device, pk_peer: any) => void): this; // FIXME: define pk_peer
  on(event: 'secInfoRequest', listener: (device: Device, event: any) => void): this; // FIXME: define event
  on(event: 'securityRequest', listener: (device: Device, event: any) => void): this; // FIXME: define event
  on(event: 'connParamUpdateRequest', listener: (device: Device, connectionParameters: ConnectionParameters) => void): this;
  on(event: 'deviceDiscovered', listener: (device: Device) => void): this;
  on(event: 'advertiseTimeout', listener: () => void): this;
  on(event: 'scanTimedOut', listener: () => void): this;
  on(event: 'connectTimedOut', listener: (address: Address) => void): this;
  on(event: 'securityRequestTimedOut', listener: (device: Device) => void): this;
  on(event: 'serviceAdded', listener: (service: Service) => void): this;
  on(event: 'characteristicAdded', listener: (characteristic: Characteristic) => void): this;
  on(event: 'descriptorAdded', listener: (descriptor: Descriptor) => void): this;
  on(event: 'characteristicValueChanged', listener: (characteristic: Characteristic) => void): this;
  on(event: 'descriptorValueChanged', listener: (descriptor: Descriptor) => void): this;
  on(event: 'attMtuChanged', listener: (device: Device, newMtu: number) => void): this;
  on(event: 'deviceNotifiedOrIndicated', listener: (remoteDevice: Device, characteristic: Characteristic) => void): this;
  on(event: 'txComplete', listener: (remoteDevice: Device, count: number) => void): this;
  on(event: 'dataLengthChanged', listener: (remoteDevice: Device, maxTxOctets: number) => void): this;
}

export declare class AdapterFactory extends EventEmitter {
  static getInstance(): AdapterFactory;
  getAdapters(callback?: (err: any, adapters: Adapter[]) => void);
  createAdapter(sdVersion: 'v2' | 'v3', comName: string, instanceId: string): Adapter;
}

export declare class ServiceFactory {
  createService(uuid: string, serviceType: string);
  createCharacteristic(service: Service, uuid: string, value: Array<number>, properties: any, options: any);
  createDescriptor(characteristic: Characteristic, uuid: string, value: Array<number>, options: any);
}

export declare interface KeyPair {
  sk: string;
  pk: string;
}

export declare interface PublicKey {
  pk: string;
}

export declare interface SharedSecret {
  ss: string;
}

export declare class Security {
  generateKeyPair(): KeyPair;
  generatePublicKey(privateKey: string): PublicKey;
  generateSharedSecred(privateKey: string, publicKey: string): SharedSecret;
}

export declare interface DfuTransportParameters {
  adapter: Adapter;
  targetAddress: string;
  targetAddressType: string;
  prnValue?: number;
  mtuSize?: number;
}

export declare class Dfu extends EventEmitter {
  constructor(transportType: string, transportParameters: DfuTransportParameters);
  performDFU(zipFilePath: string, callback: (err?: any, abort?: boolean) => void): void;
  abort(): void;
}

export declare function getFirmwarePath(family: string): string;
export declare function getFirmwareString(family: string): string;

export const driver: any;
