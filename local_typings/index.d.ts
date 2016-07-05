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

export interface AdapterState {
  instanceId: string;
  port: string;
  serialNumber: string;
  address: string;
}

export interface Device {
  instanceId: string;
  address: string;
  role: string;
  connectionHandle: string;
  name: string;
}

export interface Service {
  instanceId: string;
  deviceInstanceId: string;
  type: string;
  uuid: string;
}

export interface Characteristic {
  instanceId: string;
  serviceInstanceId: string;
  handle: string;
  uuid: string;
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

export interface Adapter {
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

  // do not know how to extend in the declaration file so adding the
  // methods manually !!
  on(eventname: string, listener: Function): void;
  removeListener(eventname: string, listener: Function): void;
}

export var api: any;
export var driver: any;
