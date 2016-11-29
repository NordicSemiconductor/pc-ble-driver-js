
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
function getAddressFromFICR(seggerSerialNumber, addOneToLSB = false) {
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

            if (addOneToLSB) {
                data[0] = (data[0] + 1) % 0x100;
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

module.exports = {
    getAddressFromFICR,
};
