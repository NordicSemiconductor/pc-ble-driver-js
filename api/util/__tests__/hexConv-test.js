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

const HexConv = require('../hexConv');

describe('numberToHexString', () => {
    it('should return emtpty string for non-numeric input', () => {
        expect(HexConv.numberToHexString('not a number')).toEqual('');
    });

    it('should convert 0', () => {
        expect(HexConv.numberToHexString(0)).toEqual('00');
    });

    it('should convert 1000', () => {
        expect(HexConv.numberToHexString(1000)).toEqual('03E8');
    });

    it('should convert 65536', () => {
        expect(HexConv.numberToHexString(65536)).toEqual('010000');
    });
});

describe('numberTo16BitUuid', () => {
    it('should convert 0', () => {
        expect(HexConv.numberTo16BitUuid(0)).toEqual('0000');
    });

    it('should convert 1000', () => {
        expect(HexConv.numberTo16BitUuid(1000)).toEqual('03E8');
    });

    it('should convert 65535', () => {
        expect(HexConv.numberTo16BitUuid(65535)).toEqual('FFFF');
    });
});

describe('arrayTo128BitUuid', () => {
    it('should convert dfu packet characteristic uuid', () => {
        const dfuPacketCharacteristicUuidArray = [80, 234, 218, 48, 136, 131, 184,
            159, 96, 79, 21, 243, 2, 0, 201, 142];
        const dfuPacketCharacteristicUuidString = '8EC90002F3154F609FB8838830DAEA50';

        expect(HexConv.arrayTo128BitUuid(dfuPacketCharacteristicUuidArray))
            .toEqual(dfuPacketCharacteristicUuidString);
    });
});
