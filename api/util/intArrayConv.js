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


function intToArray(integer, sizeInBytes) {
    let array = [];
    for (let i = 0; i < sizeInBytes; i++) {
        array[i] = integer % 0x100;
        integer = Math.floor(integer / 0x100);
    }
    if (integer) {
        throw new Error('Integer to array conversion overflow.');
    }
    return array;
}

function arrayToInt(array) {
    if (!Array.isArray(array)) {
        throw new Error('Array to integer conversion error: Argument is not an array.');
    }
    let integer = 0;
    let factor = 1;
    for (let byte of array) {
        if (!Number.isInteger(byte)) {
            throw new Error('Array to integer conversion error: Array contains non-integer.');
        }
        if (byte < 0) {
            throw new Error('Array to integer conversion error: Array contains negative integer.');
        }
        if (byte > 0xFF) {
            throw new Error('Array to integer conversion error: Array contains integer larger than 255.');
        }
        integer += byte * factor;
        factor *= 0x100;
    }
    return integer;
}

module.exports = {
    intToArray,
    arrayToInt,
};
