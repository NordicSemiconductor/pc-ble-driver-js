
// TODO: fix pc-ble-driver-js import
import bleDriver from 'pc-ble-driver-js';

// TODO: Add DI to AdapterFactory. whatever that means.
class AdapterState {
    constructor(instanceId, port) {
        this._instanceId = instanceId + '.' + port;
        this._port = port;

        this._available = false;

        this._scanning = false;
        this._advertising = false;
    }

    get instanceId() {
        return this._instanceId;
    }

    get port() {
        return this._port;
    }

    get powered() {
        // TODO: ?
    }

    // true if adapter is opened and functional
    get available() {
        return this._available;
    }

    set available(available) {
        this._available = available;
    }

    // Is scanning more appropriate
    get scanning() {
        return this._scanning;
    }

    set scanning(scanning) {
        this._scanning = scanning;
    }

    get advertising() {
        return this._advertising;
    }

    set advertising() {
        this._advertising = advertising;
    }

    get address() {
        // TODO: Retrieve address from device? Can be set, ask each time?

        bleDriver.gap_get_address((address, err) => {
            if (err) {
                // TODO: logging?
                return;
            }

            // TODO: how to get address out of the driver callback?
        });
    }

    get name() {
        // TODO: Retrieve name from device? Can be set, ask each time?

        bleDriver.gap_get_device_name((name, err) => {
            if (err) {
                // TODO: logging?
                return;
            }

            this._name = name;
            // TODO: how to get name out of the driver callback?
        });
    }

    set name(name) {
        this._name = name;
    }

    get firmwareVersion() {
        if (this._firmwareVersion) {
            return this._firmwareVersion;
        }

        bleDriver.get_version((version, err) => {
            if (err) {
                // TODO: logging?
            }

            // TODO: how to get version out of the driver callback?
        });
    }

    get baudRate() {
        return this._baudRate;
    }

    set baudRate(baudRate) {
        this._baudRate = baudRate;
    }

    get parity() {
        return this._parity;
    }

    set parity(parity) {
        this._parity = parity;
    }

    get flowControl() {
        return this._flowControl;
    }

    set flowControl(flowControl) {
        this._flowControl = flowControl;
    }
}
