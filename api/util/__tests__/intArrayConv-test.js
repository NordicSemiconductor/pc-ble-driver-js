
import {intToArray, arrayToInt} from '../intArrayConv';

describe('Integer/array conversions', () => {

    describe('when converting integers to arrays', () => {

        it('should throw if the array is too small to fit the integer', () => {
            expect(() => intToArray(0x100, 1)).toThrow();
            expect(() => intToArray(0x10000, 2)).toThrow();
            expect(() => intToArray(0x1000000, 3)).toThrow();
            expect(() => intToArray(0x100000000, 4)).toThrow();
        });

        it('should convert a two byte integer correctly to a two element array (little-endian)', () => {
            expect(intToArray(0x928f, 2)).toEqual([0x8f, 0x92]);
        });

        it('should pad the resulting array with 0x00', () => {
            expect(intToArray(0x01, 4)).toEqual([0x01, 0x00, 0x00, 0x00]);
        });

        it ('should convert 0x123456 to [0x56, 0x34, 0x12]', () => {
            expect(intToArray(0x123456, 3)).toEqual([0x56, 0x34, 0x12]);
        });

        // TODO: More test cases for correct behaviour, especially edge cases.
    });

    describe('when converting arrays to integers', () => {

        it('should throw if the argument is not an array', () => {
            expect(() => arrayToInt({})).toThrow();
            expect(() => arrayToInt(42)).toThrow();
            expect(() => arrayToInt("string")).toThrow();
        });

        it('should throw if the array contains non-integers', () => {
            expect(() => arrayToInt([82, 129, "baz"])).toThrow();
            expect(() => arrayToInt([{}, 42])).toThrow();
        });

        it('should throw if the array values are not in (0x00, 0xFF)', () => {
            expect(() => arrayToInt([17, -3])).toThrow();
            expect(() => arrayToInt([42, 0x100])).toThrow();
        });

        it('should convert [0x00] to 0', () => {
            expect(arrayToInt([0x00])).toEqual(0);
        });

        it ('should convert [0x34, 0x12] to 0x1234', () => {
            expect(arrayToInt([0x34, 0x12])).toEqual(0x1234);
        })

        // TODO: More test cases for correct behaviour, especially edge cases.
    });

});
