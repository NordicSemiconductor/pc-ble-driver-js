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

const assert = require('assert');
const crypto = require('crypto');
const setup = require('./setup');
const os = require('os');

const adapterFactory = setup.adapterFactory;

const peripheralDeviceAddress = 'FF:11:22:33:AA:CE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:CF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

let centralAsDevice;

function addAdapterFactoryListeners() {
    adapterFactory.on('added', adapter => {
        console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('removed', adapter => {
        console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('error', error => {
        console.log('onError: Error occured: ' + JSON.stringify(error, null, 1));
    });
}

function addAdapterListener(adapter, prefix) {
    adapter.on('logMessage', (severity, message) => { console.log(`${prefix} logMessage: ${message}`); });
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', error => {
        console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
        assert(false);
    });

    adapter.on('deviceConnected', device => { console.log(`${prefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { console.log(`${prefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device, null, 1)}`); });

    adapter.on('connSecUpdate', (device, connSec) => {
        console.log(`${prefix} connSecUpdate`); // - ${JSON.stringify(connSec)}`);
    });

    adapter.on('authStatus', (device, status) => {
        console.log(`${prefix} authStatus - ${JSON.stringify(status)}`); // - ${JSON.stringify(status)}`);
        assert(status.auth_status === 0);
    });

    adapter.on('secParamsRequest', (device, _secParams) => {
        console.log(`${prefix} secParamsRequest - ${JSON.stringify(_secParams)}`);
    });

    adapter.on('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        console.log(`${prefix} lescDhkeyRequest - ${JSON.stringify(pkPeer)} ${JSON.stringify(oobdReq)}`);
    });

    adapter.on('authKeyRequest', (device, keyType) => {
        console.log(`${prefix} authKeyRequest - device: ${device.address} keyType: ${keyType}`);
    });
}

function connect(adapter, connectToAddress, callback) {
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
            assert(!error);
            if (callback) callback();
        }
    );
}

function setupAdapter(adapter, name, address, addressType, callback) {
    adapter.open(
        {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 0,
            logLevel: 'info',
        },
        error => {
            assert(!error);
            adapter.enableBLE(
                null,
                (error, params, app_ram_base) => {
                    if (error) {
                        console.log(`error: ${error} params: ${JSON.stringify(params)}, app_ram_base: ${app_ram_base}`);
                    }

                    adapter.getState((error, state) => {
                        assert(!error);
                        adapter.setAddress(address, addressType, error => {
                            assert(!error);
                            adapter.setName(name, error => {
                                assert(!error);
                                callback(adapter);
                            });
                        });
                    });
                }
            );

        }
    );
}

function startAdvertising(adapter, callback) {
    adapter.setAdvertisingData(
        {
            txPowerLevel: 20,
        },
        {}, // scan response data
        error => {
            assert(!error);

            adapter.startAdvertising(
                {
                    interval: 100,
                    timeout: 100,
                },
                error => {
                    assert(!error);
                    if (callback) callback();
                }
            );
        }
    );
}

function setupSecurityRequest(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {

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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    centralAdapter.once('securityRequest', (device, params) => {
        console.log('securityRequest received');
        centralAdapter.authenticate(peripheralAsDevice.instanceId, null, err => {
            if (err) {
                console.log('Error rejecting securtiy request ' + JSON.stringify(err));
            } else {
                console.log('securityRequest rejected');
            }
        });
    });

    // Wait so that peripheral has time to receive connected event
    setTimeout(() => {
        console.log('Peripheral calling authenticate');
        peripheralAdapter.authenticate(centralAsDevice.instanceId, secParamsPeripheral, err => {
            if (err) {
                console.log('Error starting authentication');
            } else {
                console.log('Authentication started');
            }
        });
    }, 1000);
}

function setupAuthLegacyJustWorks(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {

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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
            assert(!err);
        });
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, err => {
            assert(!err);
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLegacyJustWorks');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
        console.log('\n\nLegacyJustWorks authentication started..\n\n');

        if (err) {
            console.log('Error starting authentication ' + JSON.stringify(err));
        }
    });
}

function setupAuthLegacyOOB(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {
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
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
            assert(!err);
            console.log('#PERIPH replySecParams callback'); //+ JSON.stringify(keyset));
        });
    });

    const oob_data = [255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    centralAdapter.once('authKeyRequest', (device, keyType) => {
        console.log('#CENTRAL Replying with auth key: ' + oob_data);
        centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_OOB, oob_data);
    });

    peripheralAdapter.once('authKeyRequest', (device, keyType) => {
        console.log('#PERIPH Replying with auth key: ' + oob_data);
        peripheralAdapter.replyAuthKey(device.instanceId, peripheralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_OOB, oob_data);
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, err => {
            assert(!err);
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLegacyOOB');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
        console.log('\n\nLegacyOOB authentication started..\n\n');

        if (err) {
            console.log('Error starting authentication ' + JSON.stringify(err));
        }
    });
}

function setupAuthLESCJustWorks(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {
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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    const centralEdch = crypto.createECDH('prime256v1');
    const perihperalEdch = crypto.createECDH('prime256v1');

    const debugPrivateKey = '3f49f6d4a3c55f3874c9b3e3d2103f504aff607beb40b7995899b8a6cd3c1abd';
    const debugPublicKey = '20b003d2f297be2c5e2c83a7e9f9a5b9eff49111acf4fddbcc0301480e359de6dc809c49652aeb6d63329abf5a52155c766345c28fed3024741c8ed01589d28b';

    let centralPublicKey = centralEdch.generateKeys();
    const peripheralPublicKey = perihperalEdch.generateKeys();

    centralEdch.setPrivateKey(debugPrivateKey, 'hex');
    centralEdch.setPublicKey('04' + debugPublicKey, 'hex');

    centralPublicKey = centralEdch.getPublicKey();

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

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, centralSecKeyset, err => {
            assert(!err);
        });
    });

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParams, peripheralSecKeyset, (err, keyset) => {
            assert(!err);
        });
    });

    centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        console.log('#CENTRAL lescDhkeyRequest - '); // + JSON.stringify(pkPeer) + ' ' + JSON.stringify(oobdReq));

        const dhKey = centralEdch.computeSecret(Buffer([0x04].concat(pkPeer.pk)));

        centralAdapter.replyLescDhkey(device.instanceId, Array.from(dhKey), err => {
            assert(!err); console.log('We are here 1');
        });
    });

    peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        console.log('#PERIPH lescDhkeyRequest - '); // + JSON.stringify(pkPeer) + ' ' + JSON.stringify(oobdReq));

        const dhKey = perihperalEdch.computeSecret(Buffer([0x04].concat(pkPeer.pk)));

        peripheralAdapter.replyLescDhkey(device.instanceId, Array.from(dhKey), err => {
            assert(!err); console.log('We are here 2');
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLESCJustWorks');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParams, err => {
        console.log('\n\nLESCJustWorks authentication started..\n\n');

        if (err) {
            console.log('Error starting authentication ' + JSON.stringify(err));
        }
    });
}

function setupAuthLESCPasskey(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {

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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false, /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
    let keypressSequence = [
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_START',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR',
        'BLE_GAP_KP_NOT_TYPE_PASSKEY_END',
    ];

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, secKeyset, (err, keyset) => {
            assert(!err);
        });
    });

    let passkey;

    centralAdapter.once('authKeyRequest', (device, keyType) => {
        console.log('#CENTRAL Replying with auth key ' + passkey);

        setTimeout(() => {
            centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_START, () => {
                centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN, () => {
                    centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN, () => {
                        centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT, () => {
                            centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR, () => {
                                centralAdapter.notifyKeypress(device.instanceId, centralAdapter.driver.BLE_GAP_KP_NOT_TYPE_PASSKEY_END, () => {
                                    console.log('\n\n\n\nkeypressIndex is ' + keypressIndex);
                                    centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, passkey, err => {
                                        assert(!err);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }, 500);
    });

    peripheralAdapter.once('passkeyDisplay', (device, matchRequest, _passkey) => {
        console.log('#PERIPH passkeyDisplay - ' + _passkey);
        passkey = _passkey;
    });

    peripheralAdapter.on('keyPressed', (device, keypress) => {
        assert(keypressIndex < keypressSequence.length);
        // console.log('\n\n\n\n\n\n\nReceived ' + keypress + ' wanted ' + keypressSequence[keypressIndex]);
        assert(keypress === keypressSequence[keypressIndex++]);
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, (err, keyset) => {
            assert(!err);
            console.log('#CENTRAL replySecParams callback');
        });
    });

    centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        centralAdapter.replyLescDhkey(device.instanceId, [
            0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
            0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
            0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
            0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
        ], err => {
            assert(!err);
        });
    });

    peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        peripheralAdapter.replyLescDhkey(device.instanceId, [
            0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
            0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
            0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
            0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
        ], err => {
            assert(!err);
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLESPasskey');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
        assert(!err);
        console.log('\n\LESCPasskey authentication started..\n\n');
    });
}

function setupAuthLESCOOB(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {
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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false, /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.getLescOobData(device.instanceId,
            [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ],
            (err, _ownOobData) => {
                assert(!err);

                peripheralOobData = _ownOobData;

                console.log('\n\n\n\n\n\n#PERIPH OOB data:' + JSON.stringify(_ownOobData));

                peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, secKeyset, (err, keyset) => {
                    assert(!err);
                });
            });
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.getLescOobData(device.instanceId,
            [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
            ],
            (err, _ownOobData) => {
                assert(!err);
                centralOobData = _ownOobData;

                centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, (err, keyset) => {
                    assert(!err);
                });
            });
    });

    centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        assert(oobdReq);

        console.log('\n\n\n\n\n\n#CENTRAL OOB data:' + JSON.stringify(peripheralOobData));

        centralAdapter.setLescOobData(device.instanceId, centralOobData, peripheralOobData, err => {
            assert(!err);

            centralAdapter.replyLescDhkey(device.instanceId,
                [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                ], err => {
                    assert(!err);
                });
        });
    });

    peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        assert(oobdReq);
        console.log('\n\n\n\n\n\n#PERIPH OOB data:' + JSON.stringify(centralOobData));

        peripheralAdapter.setLescOobData(device.instanceId, peripheralOobData, centralOobData, err => {
            assert(!err);

            peripheralAdapter.replyLescDhkey(device.instanceId,
                [0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
                    0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
                    0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
                    0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
                ], err => {
                    assert(!err);
                });
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLESCOOB');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
        assert(!err);
        console.log('\n\LESCOOB authentication started..\n\n');
    });
}

function setupAuthLegacyPasskey(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {

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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: true,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParamsPeripheral, null, (err, keyset) => {
            assert(!err);
            console.log('#PERIPH replySecParams callback'); // + JSON.stringify(keyset));
        });
    });

    let passkey;

    centralAdapter.once('authKeyRequest', (device, keyType) => {
        console.log('Replying with auth key ' + passkey);

        centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, passkey, err => {
            assert(!err);
        });
    });

    peripheralAdapter.once('passkeyDisplay', (device, matchRequest, _passkey) => {
        console.log('#PERIPH passkeyDisplay - ' + _passkey);
        passkey = _passkey;
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, null, (err, keyset) => {
            assert(!err);
            console.log('#CENTRAL replySecParams callback');// + JSON.stringify(keyset));
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLegacyPasskey');
        authenticatedCallback();
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParamsCentral, err => {
        assert(!err);
        console.log('\n\nLegacyPasskey authentication started..\n\n');
    });
}

function setupAuthLESCNumericComparisonExternal(
    centralAdapter,
    peripheralAdapter,
    peripheralDevice,
    authenticatedCallback) {

    const secParams = {
        bond: true,
        mitm: true,
        lesc: true,
        keypress: false,
        io_caps: peripheralAdapter.driver.BLE_GAP_IO_CAPS_KEYBOARD_DISPLAY,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_own: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
    };

    const secKeyset = {
        keys_own: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: { pk: peripheralAdapter.computePublicKey() },
        },
        keys_peer: {
            enc_key: null,
            id_key: null,
            sign_key: null,
            pk: null,
        },
    };

    const peripheralName = os.hostname();

    var advertisingData = {
        shortenedLocalName: peripheralName,
        flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
        txPowerLevel: -10,
    };

    var scanResponseData = {
    };

    var options = {
        interval: 40,
        timeout: 180,
        connectable: true,
        scannable: false,
    };

    centralAdapter.disconnect(peripheralDevice.instanceId, err => {
        assert(!err);

        peripheralAdapter.setAdvertisingData(advertisingData, scanResponseData, err => {
            assert(!err);
            peripheralAdapter.startAdvertising(options, err => {
                assert(!err);

                peripheralAdapter.once('authStatus', (device, status) => {
                    assert(status.auth_status === 0);
                    authenticatedCallback();
                });

                peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
                    assert(_secParams.lesc === true);
                    assert(_secParams.oob === false);
                    assert(_secParams.mitm === true);

                    peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParams, secKeyset, (err, keyset) => {
                        assert(!err);
                    });
                });

                peripheralAdapter.once('passkeyDisplay', (device, match_request, passkey) => {
                    peripheralAdapter.replyAuthKey(device.instanceId, peripheralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, null, err => {
                        assert(!err);
                    });
                });

                peripheralAdapter.once('lescDhkeyRequest', (device, publicKeyPeer, oobdReq) => {
                    console.log('publicKeyPeer: ' + JSON.stringify(publicKeyPeer));
                    let sharedSecret = peripheralAdapter.computeSharedSecret(publicKeyPeer);
                    console.log('sharedSecret (calculated): ' + JSON.stringify(sharedSecret));

                    peripheralAdapter.replyLescDhkey(device.instanceId, sharedSecret, err => {
                        assert(!err);
                    });
                });

                console.log(`\n\nLescNumericComparisonExternal authentication started.. not using centralAdapter, let that be the an external device supporting BLE LESC instead. \n#1 Please connect to ${peripheralName} from your external device (phone, etc).\n#2 Start bonding on your external device.\n\n`);
            });
        });
    });
}

function setupAuthLESCNumericComparison(
    centralAdapter,
    peripheralAdapter,
    peripheralAsDevice,
    authenticatedCallback) {

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
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
        },
        kdist_peer: {
            enc: false,   /**< Long Term Key and Master Identification. */
            id: false,    /**< Identity Resolving Key and Identity Address Information. */
            sign: false,  /**< Connection Signature Resolving Key. */
            link: false,  /**< Derive the Link Key from the LTK. */
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

    peripheralAdapter.once('secParamsRequest', (device, _secParams) => {
        peripheralAdapter.replySecParams(device.instanceId, peripheralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, secParams, secKeyset, (err, keyset) => {
            assert(!err);
        });
    });

    centralAdapter.once('secParamsRequest', (device, secParams) => {
        centralAdapter.replySecParams(device.instanceId, centralAdapter.driver.BLE_GAP_SEC_STATUS_SUCCESS, null, secKeyset, err => {
            assert(!err);
        });
    });

    centralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        centralAdapter.replyLescDhkey(device.instanceId, [
            0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
            0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
            0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
            0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
        ], err => { assert(!err); });
    });

    centralAdapter.once('passkeyDisplay', (device, match_request, passkey) => {
        centralAdapter.replyAuthKey(device.instanceId, centralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, null, err => {
            assert(!err);
        });
    });

    centralAdapter.once('authStatus', (device, status) => {
        console.log('authStatus - setupAuthLescNumericComparison');
        authenticatedCallback();
    });

    peripheralAdapter.once('lescDhkeyRequest', (device, pkPeer, oobdReq) => {
        peripheralAdapter.replyLescDhkey(device.instanceId, [
            0x20, 0xb0, 0x03, 0xd2, 0xf2, 0x97, 0xbe, 0x2c,
            0x5e, 0x2c, 0x83, 0xa7, 0xe9, 0xf9, 0xa5, 0xb9,
            0xef, 0xf4, 0x91, 0x11, 0xac, 0xf4, 0xfd, 0xdb,
            0xcc, 0x03, 0x01, 0x48, 0x0e, 0x35, 0x9d, 0xe6,
        ], err => { assert(!err); });
    });

    peripheralAdapter.once('passkeyDisplay', (device, match_request, passkey) => {
        peripheralAdapter.replyAuthKey(device.instanceId, peripheralAdapter.driver.BLE_GAP_AUTH_KEY_TYPE_PASSKEY, null, err => {
            assert(!err);
        });
    });

    centralAdapter.authenticate(peripheralAsDevice.instanceId, secParams, err => {
        assert(!err);
        console.log('\n\nLescNumericComparison authentication started..\n\n');
    });
}

function compareArray(first, second) {
    return new Buffer(first).compare(new Buffer(second)) === 0;
}

function keyGeneration(central, peripheral) {
    central._generateKeyPair();
    peripheral._generateKeyPair();

    const origCentralPK = central._keys.pk;
    const origPeripheralPK = peripheral._keys.pk;

    assert(origCentralPK !== origPeripheralPK);

    assert(compareArray(origCentralPK, central.computePublicKey()));
    assert(compareArray(origPeripheralPK, peripheral.computePublicKey()));

    const centralSharedSecret = central.computeSharedSecret({ pk: origPeripheralPK });
    const peripheralSharedSecret = peripheral.computeSharedSecret({ pk: origCentralPK });

    assert(compareArray(centralSharedSecret, peripheralSharedSecret));

    assert(compareArray(origCentralPK, central.computePublicKey()));
    assert(compareArray(origPeripheralPK, peripheral.computePublicKey()));

    console.log('\n\nKeygeneration - OK\n\n');
}

function runTests(centralAdapter, peripheralAdapter) {
    addAdapterListener(centralAdapter, '#CENTRAL');
    addAdapterListener(peripheralAdapter, '#PERIPH');

    setupAdapter(centralAdapter, 'centralAdapter', centralDeviceAddress, centralDeviceAddressType, adapter => {
    });

    setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, adapter => {
        startAdvertising(peripheralAdapter, () => {
            console.log('Advertising started');
        });

        keyGeneration(centralAdapter, peripheralAdapter);

        centralAdapter.once('deviceConnected', peripheralDevice => {
            setupAuthLegacyJustWorks(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                console.log('\n\nLegacyJustWorks - OK\n\n');
                setupAuthLegacyPasskey(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                    console.log('\n\nLegacyPasskey - OK\n\n');
                    setupAuthLegacyOOB(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                        console.log('\n\nLegacyOOB - OK\n\n');
                        setupAuthLESCJustWorks(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                            console.log('\n\nLESCJustWorks - OK\n\n');
                            setupAuthLESCNumericComparison(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                                console.log('\n\nLESCNumericComparison - OK\n\n');
                                setupAuthLESCPasskey(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                                    console.log('\n\nLESCPasskey - OK\n\n');
                                    setupAuthLESCOOB(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                                        console.log('\n\nLESCOOB - OK\n\n');
                                        setupAuthLESCNumericComparisonExternal(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                                            console.log('\n\nLESCNumericComparisonExternal - OK\n\n');
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        connect(centralAdapter, { address: peripheralDeviceAddress, type: peripheralDeviceAddressType });
    });
}

function runFailedTests(centralAdapter, peripheralAdapter) {
    addAdapterListener(centralAdapter, '#CENTRAL');
    addAdapterListener(peripheralAdapter, '#PERIPH');

    setupAdapter(centralAdapter, 'centralAdapter', centralDeviceAddress, centralDeviceAddressType, adapter => {
    });

    setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, adapter => {
        startAdvertising(peripheralAdapter, () => {
            console.log('Advertising started');
        });

        peripheralAdapter.once('deviceConnected', centralDevice => {
            centralAsDevice = centralDevice;
        });

        centralAdapter.once('deviceConnected', peripheralDevice => {
            // setupAuthLESCNumericComparison(centralAdapter, peripheralAdapter, peripheralDevice, () => {
            //     console.log('\n\nLESCNumericComparison - OK\n\n');
            // });
            setupSecurityRequest(centralAdapter, peripheralAdapter, peripheralDevice, () => {
                console.log('\n\nSecurityRequest - OK\n\n');
            });
        });

        connect(centralAdapter, { address: peripheralDeviceAddress, type: peripheralDeviceAddressType });
    });
}

addAdapterFactoryListeners();

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    assert(Object.keys(adapters).length == 2, 'The number of attached devices to computer must exactly 2');

    runTests(adapters[Object.keys(adapters)[0]], adapters[Object.keys(adapters)[1]]);
    //runFailedTests(adapters[Object.keys(adapters)[0]], adapters[Object.keys(adapters)[1]]);
});
