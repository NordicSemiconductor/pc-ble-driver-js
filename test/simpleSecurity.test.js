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

const { grabAdapter, releaseAdapter, setupAdapter, outcome } = require('./setup');

const assert = require('assert');
const crypto = require('crypto');

const debug = require('debug')('ble-driver:test:simple-security');

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

function addAdapterListener(adapter, prefix) {
    adapter.on('connSecUpdate', () => {
        debug(`${prefix} connSecUpdate`);
    });

    adapter.on('authStatus', (device, status) => {
        debug(`${prefix} authStatus - ${JSON.stringify(status)}`); // - ${JSON.stringify(status)}`);
        assert(status.auth_status === 0);
    });

    adapter.on('secParamsRequest', (device, _secParams) => {
        debug(`${prefix} secParamsRequest - ${JSON.stringify(_secParams)}`);
    });

    adapter.on('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        debug(`${prefix} lescDhkeyRequest - ${JSON.stringify(pkPeer)} ${JSON.stringify(oobdReq)}`);
    });

    adapter.on('authKeyRequest', (device, keyType) => {
        debug(`${prefix} authKeyRequest - device: ${device.address} keyType: ${keyType}`);
    });
}

function connect(adapter, connectToAddress) {
    return new Promise((resolve, reject) => {
        const options = {
            scanParams: {
                active: false,
                interval: 100,
                window: 50,
                timeout: 20,
            },
            connParams: {
                min_conn_interval: 7.5,
                max_conn_interval: 7.5,
                slave_latency: 0,
                conn_sup_timeout: 4000,
            },
        };

        adapter.connect(
            connectToAddress,
            options,
            error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
    });
}

function startAdvertising(adapter) {
    return new Promise((resolve, reject) => {
        adapter.setAdvertisingData(
            {
                txPowerLevel: 20,
            },
            {}, // scan response data
            setAdvertisingError => {
                if (setAdvertisingError) {
                    reject(setAdvertisingError);
                    return;
                }

                adapter.startAdvertising(
                    {
                        interval: 100,
                        timeout: 100,
                    },
                    startAdvertisingError => {
                        if (startAdvertisingError) {
                            reject(startAdvertisingError);
                            return;
                        }

                        resolve();
                    });
            });
    });
}

async function setupAuthLegacyJustWorks(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParamsPeripheral = {
        bond: false,
        mitm: false,
        lesc: false,
        keypress: false,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsCentral = {
        bond: false,
        mitm: false,
        lesc: false,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, keyset });
            });
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams, keyset });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [secParamsRequestPeripheralResult, secParamsRequestCentralResult, authStatusCentralResult]
        = await outcome([secParamsRequestPeripheral, secParamsRequestCentral, authStatusCentral]);

    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLegacyOOB(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParamsPeripheral = {
        bond: true,
        mitm: true,
        lesc: false,
        keypress: false,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: true,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: true,   /** Long Term Key and Master Identification. */
            id: false,   /** Identity Resolving Key and Identity Address Information. */
            sign: false, /** Connection Signature Resolving Key. */
            link: false, /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,   /** Long Term Key and Master Identification. */
            id: false,   /** Identity Resolving Key and Identity Address Information. */
            sign: false, /** Connection Signature Resolving Key. */
            link: false, /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsCentral = {
        bond: true,
        mitm: true,
        lesc: false,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: true,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: true,   /** Long Term Key and Master Identification. */
            id: false,   /** Identity Resolving Key and Identity Address Information. */
            sign: false, /** Connection Signature Resolving Key. */
            link: false, /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,   /** Long Term Key and Master Identification. */
            id: false,   /** Identity Resolving Key and Identity Address Information. */
            sign: false, /** Connection Signature Resolving Key. */
            link: false, /** Derive the Link Key from the LTK. */
        },
    };

    const oobData = [255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, keyset });
            });
        });
    });

    const authKeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('authKeyRequest', (device, keyType) => {
            centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_OOB, oobData, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(device, keyType, oobData);
            });
        });
    });

    const authKeyRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('authKeyRequest', (device, keyType) => {
            peripheralAdapter.replyAuthKey(device.instanceId, peripheralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_OOB, oobData, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(device, keyType, oobData);
            });
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestPeripheralResult,
        secParamsRequestCentralResult,
        authKeyRequestPeripheralResult,
        authKeyRequestCentralResult,
        authStatusCentralResult,
    ] = await outcome([
        secParamsRequestPeripheral,
        secParamsRequestCentral,
        authKeyRequestPeripheral,
        authKeyRequestCentral,
        authStatusCentral]);

    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(authKeyRequestPeripheralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(authKeyRequestCentralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLESCJustWorks(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParams = {
        bond: false,
        mitm: false,
        lesc: true,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const centralEdch = crypto.createECDH('prime256v1');
    const perihperalEdch = crypto.createECDH('prime256v1');

    const debugPrivateKey = '3f49f6d4a3c55f3874c9b3e3d2103f504aff607beb40b7995899b8a6cd3c1abd';
    const debugPublicKey = '20b003d2f297be2c5e2c83a7e9f9a5b9eff49111acf4fddbcc0301480e359de6dc809c49652aeb6d63329abf5a52155c766345c28fed3024741c8ed01589d28b';

    centralEdch.generateKeys();
    centralEdch.setPrivateKey(debugPrivateKey, 'hex');
    centralEdch.setPublicKey(`04${debugPublicKey}`, 'hex');

    const peripheralPublicKey = perihperalEdch.generateKeys();
    const centralPublicKey = centralEdch.getPublicKey();

    const centralSecKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: {
                pk: Array.from(centralPublicKey.slice(1)),
            },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    const peripheralSecKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: {
                pk: Array.from(peripheralPublicKey.slice(1)),
            },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, _secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, centralSecKeyset, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, centralSecKeyset });
            });
        });
    });

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParams, peripheralSecKeyset, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, peripheralSecKeyset, keyset });
            });
        });
    });

    const lescDhkeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            const dhKey = centralEdch.computeSecret(Buffer([0x04].concat(pkPeer.pk)));

            centralAdapter.replyLescDhkey(device.instanceId, Array.from(dhKey), err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, pkPeer, oobdReq, dhKey });
            });
        });
    });

    const lescDhkeyRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            const dhKey = perihperalEdch.computeSecret(Buffer([0x04].concat(pkPeer.pk)));

            peripheralAdapter.replyLescDhkey(device.instanceId, Array.from(dhKey), err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(device, pkPeer, oobdReq, dhKey);
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParams, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestCentralResult,
        secParamsRequestPeripheralResult,
        lescDhkeyRequestCentralResult,
        lescDhkeyRequestPeripheralResult,
        authStatusCentralResult] = await outcome([
            secParamsRequestCentral,
            secParamsRequestPeripheral,
            lescDhkeyRequestCentral,
            lescDhkeyRequestPeripheral,
            authStatusCentral]);

    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(lescDhkeyRequestCentralResult).toBeDefined();
    expect(lescDhkeyRequestPeripheralResult).toBeDefined();
    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLESCPasskey(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParamsPeripheral = {
        bond: false,
        mitm: true,
        lesc: true,
        keypress: true,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_DISPLAY_ONLY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };
    const secParamsCentral = {
        bond: false,
        mitm: true,
        lesc: true,
        keypress: true,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_KEYBOARD_ONLY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };
    const secKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: {
                pk: [
                    0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                    0xdc, 0x80, 0x9c, 0x49, 0x65, 0x2a, 0xeb, 0x6d,
                    0x63, 0x32, 0x9a, 0xbf, 0x5a, 0x52, 0x15, 0x5c,
                    0x76, 0x63, 0x45, 0xc2, 0x8f, 0xed, 0x30, 0x24,
                    0x74, 0x1c, 0x8e, 0xd0, 0x15, 0x89, 0xd2, 0x8b,
                ],
            },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    let keypressIndex = 0;
    const keypressSequence = [
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_START',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_END',
    ];

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, secKeyset, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, keyset });
            });
        });
    });

    let passkey;

    const authKeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('authKeyRequest', async (device, keyType) => {
            await new Promise(waitTimeout => setTimeout(waitTimeout, 500));

            const sendKeypress = keypress => new Promise((resolveKeypress, rejectKeypress) => {
                centralAdapter.notifyKeypress(device.instanceId, keypress, err => {
                    if (err) {
                        rejectKeypress(err);
                        return;
                    }

                    resolveKeypress();
                });
            });

            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_START);
            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN);
            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN);
            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT);
            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR);
            await sendKeypress(centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_END);

            centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, passkey, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, keyType });
            });
        });
    });

    const passkeyDisplayPeripheral = new Promise(resolve => {
        peripheralAdapter.once('passkeyDisplay', (device, matchRequest, _passkey) => {
            passkey = _passkey;
            resolve({ device, matchRequest, passkey: _passkey });
        });
    });

    const keyPressedPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.on('keyPressed', (device, keypress) => {
            if (keypressSequence[keypressIndex] !== keypress) {
                reject(new Error(`Expected ${keypressSequence[keypressIndex]}, but received ${keypress} at index ${keypressIndex}`));
                return;
            }

            keypressIndex += 1;

            if (keypressIndex === keypressSequence.length) {
                resolve({ keypressCount: keypressIndex, keypress });
            }
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams, keyset });
            });
        });
    });

    const lescDhkeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            centralAdapter.replyLescDhkey(device.instanceId, [
                0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, pkPeer, oobdReq });
            });
        });
    });

    const lescDhkeyRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            peripheralAdapter.replyLescDhkey(device.instanceId, [
                0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, pkPeer, oobdReq });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestCentralResult, secParamsRequestPeripheralResult,
        passkeyDisplayPeripheralResult,
        keyPressedPeripheralResult,
        authKeyRequestCentralResult,
        lescDhkeyRequestCentralResult, lescDhkeyRequestPeripheralResult,
        authStatusCentralResult] = await outcome([
            secParamsRequestCentral, secParamsRequestPeripheral,
            passkeyDisplayPeripheral,
            keyPressedPeripheral,
            authKeyRequestCentral,
            lescDhkeyRequestCentral, lescDhkeyRequestPeripheral,
            authStatusCentral]);

    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(passkeyDisplayPeripheralResult).toBeDefined();
    expect(keyPressedPeripheralResult).toBeDefined();
    expect(authKeyRequestCentralResult).toBeDefined();
    expect(lescDhkeyRequestCentralResult).toBeDefined();
    expect(lescDhkeyRequestPeripheralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(keyPressedPeripheralResult.keypressCount).toBe(keypressSequence.length);
    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLESCOOB(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParamsPeripheral = {
        bond: false,
        mitm: true,
        lesc: true,
        keypress: false,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: true,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsCentral = {
        bond: false,
        mitm: true,
        lesc: true,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_NONE,
        oob: true,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: {
                pk: [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                    0xdc, 0x80, 0x9c, 0x49, 0x65, 0x2a, 0xeb, 0x6d,
                    0x63, 0x32, 0x9a, 0xbf, 0x5a, 0x52, 0x15, 0x5c,
                    0x76, 0x63, 0x45, 0xc2, 0x8f, 0xed, 0x30, 0x24,
                    0x74, 0x1c, 0x8e, 0xd0, 0x15, 0x89, 0xd2, 0x8b,
                ],
            },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    let peripheralOobData;
    let centralOobData;

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.getLescOobData(device.instanceId,
                [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                ],
                (err, _ownOobData) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    peripheralOobData = _ownOobData;

                    debug(`#PERIPH OOB data:${JSON.stringify(_ownOobData)}`);

                    peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, secKeyset, (replySecParamsErr, keyset) => {
                        if (replySecParamsErr) {
                            reject(replySecParamsErr);
                            return;
                        }

                        resolve({ device, secParams: _secParams, keyset, ownOobData: _ownOobData });
                    });
                });
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, _secParams) => {
            centralAdapter.getLescOobData(device.instanceId,
                [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                ],
                (err, _ownOobData) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    centralOobData = _ownOobData;

                    centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, (replySecParamsErr, keyset) => {
                        if (replySecParamsErr) {
                            reject(replySecParamsErr);
                            return;
                        }

                        resolve({ device, secParams: _secParams, keyset });
                    });
                });
        });
    });


    const lescDhkeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            if (!oobdReq) {
                reject(new Error('Did not receive oobdReq parameter'));
                return;
            }

            debug(`#CENTRAL OOB data:${JSON.stringify(peripheralOobData)}`);

            centralAdapter.setLescOobData(device.instanceId, centralOobData, peripheralOobData, err => {
                if (err) {
                    reject(err);
                    return;
                }

                centralAdapter.replyLescDhkey(device.instanceId,
                    [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                        0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                        0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                        0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                    ], replyLescDhkeyErr => {
                        if (replyLescDhkeyErr) {
                            reject(replyLescDhkeyErr);
                            return;
                        }

                        resolve({ device, pkPeer, oobdReq });
                    });
            });
        });
    });

    const lescDhkeyRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            if (!oobdReq) {
                reject(new Error('Did not receive oobdReq parameter'));
                return;
            }

            peripheralAdapter.setLescOobData(device.instanceId, peripheralOobData, centralOobData, err => {
                if (err) {
                    reject(err);
                    return;
                }

                peripheralAdapter.replyLescDhkey(device.instanceId,
                    [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                        0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                        0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                        0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                    ], replyLescDhKeyError => {
                        if (replyLescDhKeyError) {
                            reject(replyLescDhKeyError);
                            return;
                        }

                        resolve({ device, pkPeer, oobdReq });
                    });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestPeripheralResult,
        secParamsRequestCentralResult,
        lescDhkeyRequestCentralResult,
        lescDhkeyRequestPeripheralResult,
        authStatusCentralResult,
    ] = await outcome([
        secParamsRequestPeripheral,
        secParamsRequestCentral,
        lescDhkeyRequestCentral,
        lescDhkeyRequestPeripheral,
        authStatusCentral]);

    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(lescDhkeyRequestCentralResult).toBeDefined();
    expect(lescDhkeyRequestPeripheralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLegacyPasskey(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParamsPeripheral = {
        bond: false,
        mitm: true,
        lesc: false,
        keypress: false,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_DISPLAY_ONLY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsCentral = {
        bond: false,
        mitm: true,
        lesc: false,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_KEYBOARD_ONLY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: true,    /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,    /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, keyset });
            });
        });
    });

    let passkey;

    const authKeyRequest = new Promise((resolve, reject) => {
        centralAdapter.once('authKeyRequest', (device, keyType) => {
            centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, passkey, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, keyType });
            });
        });
    });

    const passkeyDisplayPeripheral = new Promise(resolve => {
        peripheralAdapter.once('passkeyDisplay', (device, matchRequest, _passkey) => {
            resolve({ device, matchRequest, passkey: _passkey });
            passkey = _passkey;
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams, keyset });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestPeripheralResult,
        secParamsRequestCentralResult,
        authKeyRequestResult,
        passkeyDisplayPeripheralResult,
        authStatusCentralResult,
    ] = await outcome([secParamsRequestPeripheral, secParamsRequestCentral, authKeyRequest, passkeyDisplayPeripheral, authStatusCentral]);


    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(authKeyRequestResult).toBeDefined();
    expect(passkeyDisplayPeripheralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

async function setupAuthLESCNumericComparison(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice) {
    const secParams = {
        bond: true,
        mitm: true,
        lesc: true,
        keypress: false,
        io_caps: centralAdapter.driver.BLE_GAP_IO_CAPS_KEYBOARD_DISPLAY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /** Long Term Key and Master Identification. */
            id: false,    /** Identity Resolving Key and Identity Address Information. */
            sign: false,  /** Connection Signature Resolving Key. */
            link: false,  /** Derive the Link Key from the LTK. */
        },
    };

    const secKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: {
                pk: [
                    0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                    0xdc, 0x80, 0x9c, 0x49, 0x65, 0x2a, 0xeb, 0x6d,
                    0x63, 0x32, 0x9a, 0xbf, 0x5a, 0x52, 0x15, 0x5c,
                    0x76, 0x63, 0x45, 0xc2, 0x8f, 0xed, 0x30, 0x24,
                    0x74, 0x1c, 0x8e, 0xd0, 0x15, 0x89, 0xd2, 0x8b,
                ],
            },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    const secParamsRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
            peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParams, secKeyset, (err, keyset) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams, keyset });
            });
        });
    });

    const secParamsRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('secParamsRequest', (device, _secParams) => {
            centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, secParams: _secParams });
            });
        });
    });

    const lescDhkeyRequestCentral = new Promise((resolve, reject) => {
        centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            centralAdapter.replyLescDhkey(device.instanceId, [
                0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, pkPeer, oobdReq });
            });
        });
    });

    const passkeyDisplayCentral = new Promise((resolve, reject) => {
        centralAdapter.once('passkeyDisplay', (device, matchRequest, passkey) => {
            centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, null, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, matchRequest, passkey });
            });
        });
    });

    const authStatusCentral = new Promise(resolve => {
        centralAdapter.once('authStatus', (device, status) => {
            resolve({ device, status });
        });
    });

    const lescDhkeyRequestPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
            peripheralAdapter.replyLescDhkey(device.instanceId, [
                0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, pkPeer, oobdReq });
            });
        });
    });

    const passkeyDisplayPeripheral = new Promise((resolve, reject) => {
        peripheralAdapter.once('passkeyDisplay', (device, matchRequest, passkey) => {
            peripheralAdapter.replyAuthKey(device.instanceId, peripheralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, null, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ device, match_request: matchRequest, passkey });
            });
        });
    });

    await new Promise((resolve, reject) => {
        centralAdapter.authenticate(peripheralAsDevice.instanceId, secParams, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });

    const [
        secParamsRequestCentralResult,
        secParamsRequestPeripheralResult,
        lescDhkeyRequestCentralResult,
        lescDhkeyRequestPeripheralResult,
        passkeyDisplayCentralResult,
        passkeyDisplayPeripheralResult,
        authStatusCentralResult,
    ] = await outcome([
        secParamsRequestCentral, secParamsRequestPeripheral,
        lescDhkeyRequestCentral, lescDhkeyRequestPeripheral,
        passkeyDisplayCentral, passkeyDisplayPeripheral,
        authStatusCentral]);


    // TODO: Simple assertions, add more later
    expect(secParamsRequestCentralResult).toBeDefined();
    expect(secParamsRequestPeripheralResult).toBeDefined();
    expect(lescDhkeyRequestPeripheralResult).toBeDefined();
    expect(lescDhkeyRequestCentralResult).toBeDefined();
    expect(passkeyDisplayPeripheralResult).toBeDefined();
    expect(passkeyDisplayCentralResult).toBeDefined();
    expect(authStatusCentralResult).toBeDefined();

    expect(authStatusCentralResult.status.auth_status).toBe(0);
}

function compareArray(first, second) {
    return new Buffer(first).compare(new Buffer(second)) === 0;
}

function keyGeneration(central, peripheral) {
    central._generateKeyPair();
    peripheral._generateKeyPair();

    const origCentralPK = central._keys.pk;
    const origPeripheralPK = peripheral._keys.pk;

    expect(origCentralPK).not.toBe(origPeripheralPK);
    expect(compareArray(origCentralPK, central.computePublicKey())).toBe(true);
    expect(compareArray(origPeripheralPK, peripheral.computePublicKey())).toBe(true);

    const centralSharedSecret = central.computeSharedSecret({ pk: origPeripheralPK });
    const peripheralSharedSecret = peripheral.computeSharedSecret({ pk: origCentralPK });

    expect(compareArray(centralSharedSecret, peripheralSharedSecret)).toBe(true);

    expect(compareArray(origCentralPK, central.computePublicKey())).toBe(true);
    expect(compareArray(origPeripheralPK, peripheral.computePublicKey())).toBe(true);
}

describe('the API', async () => {
    let centralAdapter;
    let peripheralAdapter;
    let peripheralDevice;

    beforeAll(async () => {
        // Errors here will not stop the tests from running.
        // Issue filed regarding this: https://github.com/facebook/jest/issues/2713
        centralAdapter = await grabAdapter();
        peripheralAdapter = await grabAdapter();

        addAdapterListener(centralAdapter, '#CENTRAL');
        addAdapterListener(peripheralAdapter, '#PERIPH');

        await setupAdapter(centralAdapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE);
        await setupAdapter(peripheralAdapter, '#PERIPH', 'peripheral', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE);

        await startAdvertising(peripheralAdapter);
        keyGeneration(centralAdapter, peripheralAdapter);

        [, peripheralDevice] = await Promise.all([
            connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE }),
            new Promise(resolve => {
                centralAdapter.once('deviceConnected', deviceConnected => {
                    resolve(deviceConnected);
                });
            })]);

        expect(peripheralDevice.address).toEqual(PERIPHERAL_DEVICE_ADDRESS);
        expect(peripheralDevice.addressType).toEqual(PERIPHERAL_DEVICE_ADDRESS_TYPE);
    });

    afterAll(async () => {
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('shall support LegacyJustWorks', async () => {
        await setupAuthLegacyJustWorks(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LegacyPasskey', async () => {
        await setupAuthLegacyPasskey(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LegacyOOB', async () => {
        await setupAuthLegacyOOB(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LESCJustWorks', async () => {
        await setupAuthLESCJustWorks(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LESCNumericComparison', async () => {
        await setupAuthLESCNumericComparison(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LESCPasskey', async () => {
        await setupAuthLESCPasskey(centralAdapter, peripheralAdapter, peripheralDevice);
    });

    it('shall support LESCOOB', async () => {
        await setupAuthLESCOOB(centralAdapter, peripheralAdapter, peripheralDevice);
    });
});
