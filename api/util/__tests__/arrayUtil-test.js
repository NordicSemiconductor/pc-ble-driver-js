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

'use strict';

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
