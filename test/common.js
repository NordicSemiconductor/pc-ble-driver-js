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

const dec2hexStr = '0123456789abcdef'.split('');

const getRandomUUID = () => {
    const uuid = [];
    for (let j = 0; j < 32; j += 1) {
        uuid.push(Math.floor(Math.random() * 16));
    }
    return uuid.map(x => dec2hexStr[x]).join('');
}

function startAdvertising(adapter, options = {}) {
    return new Promise((resolve, reject) => {
        adapter.setAdvertisingData(
            {
                txPowerLevel: options.txPowerLevel || 20,
            },
            {}, // scan response data
            setAdvertisingDataError => {
                if (setAdvertisingDataError) {
                    reject(setAdvertisingDataError);
                }
                resolve();
            });
    })
    .then(() =>
        new Promise((resolve, reject) => {
            adapter.startAdvertising(
                {
                    interval: options.interval || 100,
                    timeout: options.timeout || 100,
                },
                startAdvertisingError => {
                    if (startAdvertisingError) {
                        reject(startAdvertisingError);
                    }
                    resolve();
                });
        }),
    )
    .catch(err => err);
}

function connect(adapter, connectToAddress, extraOptions = {}) {
    const userOptions = {};
    userOptions.scanParams = extraOptions.scanParams || {};
    userOptions.connParams = extraOptions.connParams || {};
    const options = {
        scanParams: {
            active: userOptions.scanParams.active || false,
            interval: userOptions.scanParams.interval || 100,
            window: userOptions.scanParams.window || 50,
            timeout: userOptions.scanParams.timeout || 20,
        },
        connParams: {
            min_conn_interval: userOptions.connParams.min_conn_interval || 7.5,
            max_conn_interval: userOptions.connParams.max_conn_interval || 7.5,
            slave_latency: userOptions.connParams.slave_latency || 0,
            conn_sup_timeout: userOptions.connParams.conn_sup_timeout || 4000,
        } };

    return new Promise((resolve, reject) => {
        adapter.connect(
            connectToAddress,
            options,
            connectErr => {
                if (connectErr) {
                    reject(connectErr);
                }
                resolve();
            });
    });
}

function addRandomServicesAndCharacteristicsToAdapter(serviceFactory, adapter, servicesCount, charsCount, mtu = undefined, options = {}) {
    return new Promise((resolve, reject) => {
        const services = [];

        for (let i = 0; i < servicesCount; i += 1) {
            const srvc = serviceFactory.createService(getRandomUUID());
            for (let chari = 0; chari < charsCount; chari += 1) {
                const charValue = new Array(mtu || 50);
                serviceFactory.createCharacteristic(
                    srvc,
                    getRandomUUID(),
                    charValue,
                    {
                        broadcast: options.broadcast || true,
                        read: options.read || false,
                        write: options.write || false,
                        writeWoResp: options.writeWoResp || false,
                        reliableWrite: options.reliableWrite || false,
                        notify: options.notify || true,
                        indicate: options.indicate || false,
                    },
                    {
                        maxLength: charValue.length,
                        readPerm: ['open'],
                        writePerm: ['open'],
                    });
            }
            services.push(srvc);
        }

        adapter.setServices(services, err => {
            if (err) {
                reject(new Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
            }
            resolve();
        });
    });
}


module.exports = {
    startAdvertising,
    connect,
    addRandomServicesAndCharacteristicsToAdapter,
};
