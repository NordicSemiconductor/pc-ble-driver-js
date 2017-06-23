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

/**
 * Convert an integer to a six byte BLE address on the format "xx:xx:xx:xx:xx:xx".
 *
 * @param {number} integer the number to convert
 * @returns {string} integer converted to BLE address
 */
function intToAddress(integer) {
    if (typeof (integer) !== 'number') {
        throw new Error(`Cannot convert, not a number: ${integer}`);
    }

    if (integer < 0) {
        throw new Error(`Cannot convert, negative number: ${integer}`);
    }

    let bytestring = integer.toString(16).toUpperCase();

    if (bytestring.length > 12) {
        throw new Error(`Cannot convert, number too large: ${integer}`);
    }

    const LENGTH = 12;
    bytestring = ('0'.repeat(LENGTH-1) + bytestring).slice(-LENGTH);

    const MATCH_CHARACTER_PAIRS_NOT_AT_END_OF_LINE = /[0-9A-F]{2}\B/g
    const ADD_COLON = '$&' + ':';
    return bytestring.replace(MATCH_CHARACTER_PAIRS_NOT_AT_END_OF_LINE, ADD_COLON);
}

/**
 * Convert a BLE address on the format "xx:xx:xx:xx:xx:xx" to an integer.
 *
 * @param {string} address the BLE address to convert
 * @return {number} address converted to ingeger
 */
function addressToInt(address) {
    if (typeof(address) !== 'string') {
        throw new Error(`Cannot convert, not a string: ${address}`);
    }

    const VALID_ADDRESS_PATTERN = /^[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}$/;
    if (!VALID_ADDRESS_PATTERN.test(address)) {
        throw new Error(`Cannot convert, malformed address: ${address}`);
    }

    return parseInt(address.replace(/:/g,''), 16);
}

module.exports = {
    intToAddress,
    addressToInt,
};
