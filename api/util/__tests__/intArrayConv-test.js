/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const intToArray = require('../intArrayConv').intToArray;
const arrayToInt = require('../intArrayConv').arrayToInt;

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
