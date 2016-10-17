const crc32FromFile = require('../crc').crc32FromFile;

const BAR_HEX_PATH = 'api/util/__tests__/firmwares/bar.hex';
const BAR_HEX_CRC = 372343193;

describe('calculateCrc32', () => {

    describe('when invoked with invalid path', () => {
        const promise = crc32FromFile('invalid/path/to/file.hex');

        it('returns error message', () => {
            return promise.catch(error => expect(error.message).toContain('no such file or directory'));
        });
    });

    describe('when invoked with bar.hex', () => {
        const promise = crc32FromFile(BAR_HEX_PATH);

        it('returns correct crc value', () => {
            return promise.then(result => expect(result).toBe(BAR_HEX_CRC));
        });
    });
});