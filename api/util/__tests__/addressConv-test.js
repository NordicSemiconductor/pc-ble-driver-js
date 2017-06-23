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

const AddressConv = require('../addressConv');

describe('intToAddress', () => {

    it('should throw if input is not an integer', () => {
        expect(() => AddressConv.intToAddress('not a number')).toThrow();
        expect(() => AddressConv.intToAddress({})).toThrow();
        expect(() => AddressConv.intToAddress([])).toThrow();
    });

    it('should throw for input out of bounds', () => {
        expect(() => AddressConv.intToAddress(-1)).toThrow();
        expect(() => AddressConv.intToAddress(0x1000000000000)).toThrow();
    });

    it('should convert 0 (minimum value)', () => {
        expect(AddressConv.intToAddress(0)).toEqual('00:00:00:00:00:00');
    });

    it('should convert numbers to addresses', () => {
        expect(AddressConv.intToAddress(0x123456)).toEqual('00:00:00:12:34:56');
        expect(AddressConv.intToAddress(0xBADF00D)).toEqual('00:00:0B:AD:F0:0D');
        expect(AddressConv.intToAddress(0x123456789ABC)).toEqual('12:34:56:78:9A:BC');
    });

    it('should convert 0xFFFFFFFFFFFF (maximum value)', () => {
        expect(AddressConv.intToAddress(0xFFFFFFFFFFFF)).toEqual('FF:FF:FF:FF:FF:FF');
    });

});

describe('addressToInt', () => {

    describe('when trying to convert a malformed address', () => {

        it('should throw when input is not a string', () => {
            expect(() => AddressConv.addressToInt(1000)).toThrow();
            expect(() => AddressConv.addressToInt({})).toThrow();
            expect(() => AddressConv.addressToInt([])).toThrow();
        });

        it('should throw when input address is too short', () => {
            expect(() => AddressConv.addressToInt('12:34:56:78:9A')).toThrow();
        });

        it('should throw when input address is too long', () => {
            expect(() => AddressConv.addressToInt('12:34:56:78:9A:BC:DE')).toThrow();
        });

        it('should throw when input address is malformed', () => {
            expect(() => AddressConv.addressToInt('12:34:56:7:00A')).toThrow();
        });

    });

    describe('when trying to convert a well formed address', () => {

        it('should convert 00:00:00:00:00:00 (minimum value)', () => {
            expect(AddressConv.addressToInt('00:00:00:00:00:00')).toEqual(0);
        });

        it('should convert addresses to numbers', () => {
            expect(AddressConv.addressToInt('00:00:00:12:34:56')).toEqual(0x123456);
            expect(AddressConv.addressToInt('00:00:0B:AD:F0:0D')).toEqual(0xBADF00D);
            expect(AddressConv.addressToInt('12:34:56:78:9A:BC')).toEqual(0x123456789ABC);
        });

        it ('should convert FF:FF:FF:FF:FF:FF (maximum value)', () => {
            expect(AddressConv.addressToInt('FF:FF:FF:FF:FF:FF')).toEqual(0xFFFFFFFFFFFF);
        });

    });

});
