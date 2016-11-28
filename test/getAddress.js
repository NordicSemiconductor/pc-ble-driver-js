
const spawnSync = require('child_process').spawnSync;

/**
 * Uses nrfjprog to find the BLE address. Reads the FICR and corrects the
 * two most significant bits in order to get a valid public address.
 * This way of getting a public address is basically what the SoftDevice does.
 *
 * @param seggerSerialNumber segger serial number of the device to read from
 * @param addOne Boolean switch for adding one to the read address, used for DFU
 * @return the default public BLE address of the device
 */
function getAddressFromFICR (seggerSerialNumber, addOne = false) {
    const FICR_BASE = 0x10000000;
    const DEVICEADDRTYPE = FICR_BASE + 0xA0;
    const DEVICEADDR0 = FICR_BASE + 0xA4;
    const DEVICEADDR1 = FICR_BASE + 0xA8;

    const addr0 = _readMemory(seggerSerialNumber, DEVICEADDR0);
    const addr1 = _readMemory(seggerSerialNumber, DEVICEADDR1);

    let address = addr1.slice(-4) + addr0;
    if (addOne) {
        address = _addOneTo(address)
    }
    address = _xorFirstByte0xC0(address);
    address = _colonSplit(address);
    return address;
}

/**
 * Increments raw address by 1, used for DFU address.
 *
 * @param rawAddress Address as hexadecimal string (without colons)
 * @return Hexadecimal string of the address plus one
 */
function _addOneTo(rawAddress) {
    let addressValue = parseInt(rawAddress, 16);
    addressValue += 1;
    return addressValue.toString(16).toUpperCase();
}

/**
 * Splits a hexadecimal string into string of colon separated octets.
 *
 * @param rawAddress Hexadecimal string
 * @return string of colon separated octets
 */
function _colonSplit(rawAddress) {
    let address = '';
    for (let i = 0; i < rawAddress.length; i+=2) {
        address += rawAddress.slice(i, i+2) + ':';
    }
    return address.slice(0, -1); // remove trailing colon
}

/**
 * Perform XOR 0xC0 on the first byte of a hexadecimal string.
 *
 * @param hexString The hexadecimal input string
 * @return The input string, first digit XORed with C
 */
function _xorFirstByte0xC0(hexString) {
    let firstCharacter = hexString[0];
    switch(firstCharacter) {
        case '0': case '4': case '8':
            firstCharacter = 'C';
            break;
        case '1': case '5': case '9':
            firstCharacter = 'D';
            break;
        case '2': case '6': case 'A':
            firstCharacter = 'E';
            break;
        case '3': case '7': case 'B':
            firstCharacter = 'F';
            break;
    }
    return firstCharacter + hexString.slice(1);
}

/**
 * Uses a call to nrfjprog in order to read the memory of a given address.
 *
 * @param seggerSerialNumber The SEGGER serial number of the device to read from
 * @param memoryAddress The address in memory to read
 * @return String with the memory contents in hexadecimal
 */
function _readMemory(seggerSerialNumber, memoryAddress) {
    const args = ['-s', seggerSerialNumber, '--memrd', memoryAddress];
    const result = spawnSync('nrfjprog', args);
    return _extractMemoryContent(result.stdout.toString());
}

/**
 * Extracts from a line of nrfjprog memory read output the substring
 * containing the memory contents.
 *
 * @param line one line of 'nrfjprog --memrd' output
 * @return String with the memory contents in hexadecimal
 */
function _extractMemoryContent(line) {
    // Example lines:
    // 0x100000A4: 083BF193                              |..;.|
    // 0x100000A8: 5AA8132D                              |-..Z|
    // Legend:
    // <address>: <memoryContent>      |<ascii representation>|
    const memoryContentRegEx = /^\S+\s+([0-9A-F]+)\s/;
    return line.match(memoryContentRegEx)[1];
}

module.exports = {
    getAddressFromFICR,
};
