
const nrfjprog = require('pc-nrfjprog-js');

/**
 * Uses nrfjprog to find the BLE address. Reads the FICR and corrects the
 * two most significant bits in order to get a valid public address.
 * This way of getting a public address is basically what the SoftDevice does.
 *
 * @param seggerSerialNumber segger serial number of the device to read from
 * @param addOne Boolean switch for adding one to the read address, used for DFU
 * @return Promise for the default public BLE address of the device
 */
function getAddressFromFICR(seggerSerialNumber, addOne = false) {
    const FICR_BASE = 0x10000000;
    const DEVICEADDRTYPE = FICR_BASE + 0xA0;
    const DEVICEADDR0 = FICR_BASE + 0xA4;
    const DEVICEADDR1 = FICR_BASE + 0xA8;

    return new Promise((resolve, reject) => {
        let probe = new nrfjprog.DebugProbe();
        probe.readAddress(seggerSerialNumber, DEVICEADDR0, 6, (err, data) => {
            if (err) {
                reject(err);
            }

            if (addOne) {
                data = _addOneTo(data);
            }

            data[5] |= 0xC0; // A public address has the two most significant bits set..

            let address = '';
            for (let i = 5; i >= 0; --i) {
                address += ('0' + data[i].toString(16)).slice(-2).toUpperCase() + ':';
            }
            resolve(address.slice(0, -1)); // slice to remove trailing colon
        });
    });
}

/**
 * Convenience function for debug, left for convenience.
 * Prints the array to console, both as numbers and in hex.
 */
function _printBytes(data) {
    console.log(data);
    let bytes = [];
    for (let byte of data) {
        bytes.push(byte.toString(16));
    }
    console.log(bytes);
}

/**
 * Increments the address by one. The address is represented as an array of
 * 8 bit integers in little endian order. One is added to the LSB. Any carry
 * is carried to the next byte, i.e. the full array is treated as one integer.
 *
 * @param data An array of 8 bit integers, in little endian order.
 * @return One added to the input array.
 */
function _addOneTo(data) {
    for (let i = 0; i < data.length; ++i) {
        data[i] += 1;
        if (data[i] === 256) {
            data[i] = 0;
            continue;
        }
        break;
    }
    return data;
}

module.exports = {
    getAddressFromFICR,
};
