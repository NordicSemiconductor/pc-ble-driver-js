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

const nrfjprog = require('pc-nrfjprog-js');

/**
 * Uses nrfjprog to find the BLE address. Reads the FICR and corrects the
 * two most significant bits in order to get a valid public address.
 * This way of getting a public address is basically what the SoftDevice does.
 *
 * @param seggerSerialNumber segger serial number of the device to read from
 * @param addOne Boolean switch for adding one to the read address, used for DFU
 * @return Promise for the default public BLE address of the device
 */
function getAddressFromFICR(seggerSerialNumber, addOneToLSB = false) {
    const FICR_BASE = 0x10000000;
    const DEVICEADDRTYPE = FICR_BASE + 0xA0;
    const DEVICEADDR0 = FICR_BASE + 0xA4;
    const DEVICEADDR1 = FICR_BASE + 0xA8;

    return new Promise((resolve, reject) => {
        let probe = new nrfjprog.DebugProbe();
        probe.readAddress(seggerSerialNumber, DEVICEADDR0, 6, (err, data) => {
            if (err) {
                reject(err);
            }

            if (addOneToLSB) {
                data[0] = (data[0] + 1) % 0x100;
            }

            data[5] |= 0xC0; // A public address has the two most significant bits set..

            let address = '';
            for (let i = 5; i >= 0; --i) {
                address += ('0' + data[i].toString(16)).slice(-2).toUpperCase() + ':';
            }
            resolve(address.slice(0, -1)); // slice to remove trailing colon
        });
    });
}

module.exports = {
    getAddressFromFICR,
};
