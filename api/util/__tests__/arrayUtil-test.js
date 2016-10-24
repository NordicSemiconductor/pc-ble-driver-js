const splitArray = require('../arrayUtil').splitArray;

describe('splitArray', () => {

    describe('when array is empty', () => {
        const data = [];
        const chunkSize = 1;

        it('should return empty array', () => {
            expect(splitArray(data, chunkSize)).toEqual([]);
        });
    });

    describe('when chunk size is 0', () => {
        const data = [];
        const chunkSize = 0;

        it('should throw error', () => {
            expect(() => splitArray(data, chunkSize)).toThrow();
        });
    });

    describe('when array has 1 item and chunk size is 2', () => {
        const data = [1];
        const chunkSize = 2;

        it('should return 1 chunk', () => {
            expect(splitArray(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 1 item and chunk size is 1', () => {
        const data = [1];
        const chunkSize = 1;

        it('should return 1 chunk with 1 item', () => {
            expect(splitArray(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 2 items and chunk size is 1', () => {
        const data = [1, 2];
        const chunkSize = 1;

        it('should return 2 chunks with 1 item each', () => {
            expect(splitArray(data, chunkSize)).toEqual([[1], [2]]);
        });
    });

    describe('when array has 7 items and chunk size is 3', () => {
        const data = [1, 2, 3, 4, 5, 6, 7];
        const chunkSize = 3;

        it('should return 3 chunks with max 3 items', () => {
            expect(splitArray(data, chunkSize)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
        });
    });
});
