/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const JSZip = require('jszip');
const fs = require('fs');

const EventEmitter = require('events');


// DFU control point procedure operation codes.
// (Not to be confused with "NRF DFU Object codes".)
const ControlPointOpcode = Object.freeze({
    CREATE: 0x01,
    SET_PRN: 0x02, // Set Packet Receipt Notification
    CALCULATE_CRC: 0x03, // Calculate CRC checksum
    EXECUTE: 0x04,
    SELECT: 0x06,
    RESPONSE: 0x60, // Response command, only returned by the DFU target
});

// Return codes (result codes) for Control Point operations.
const ResultCode = Object.freeze({
    INVALID_CODE: 0x00,
    SUCCESS: 0x01,
    OPCODE_NOT_SUPPORTED: 0x02,
    INVALID_PARAMETER: 0x03,
    INSUFFICIENT_RESOURCES: 0x04,
    INVALID_OBJECT: 0x05,
    UNSUPPORTED_TYPE: 0x07,
    OPERATION_NOT_PERMITTED: 0x08,
    OPERATION_FAILED: 0x0A,
});

const SECURE_DFU_SERVICE_UUID = 'FE59';
const SECURE_DFU_CONTROL_POINT_UUID = '8EC90001F3154F609FB8838830DAEA50';
const SECURE_DFU_PACKET_UUID =        '8EC90002F3154F609FB8838830DAEA50';

/**
 * Class that provides Dfu controller functionality
 * @class
 */

class Dfu extends EventEmitter {
    /**
    * Constructor that shall not be used by developer.
    * @private
    */
    constructor(adapter = null) {
        super();

        this._adapter = adapter;
        this._zipFilePath = null;

        this._controlPointCharacteristicId = null;
        this._packetCharacteristicId = null;
    }

    // Start or resume DFU process
    // TODO: Implement
    // TODO: Make zipFilePath and adapter+instanceId optional (use existing if argument missing)
    // Should only have logic for handling zipFilePath and adapter, then (re)start the process.
    startDFU(zipFilePath, adapter, instanceId) {
        this._zipFilePath = zipFilePath || this._zipFilePath;
        this._adapter = adapter || this._adapter;
        this._instanceId = instanceId || this._instanceId;

        this._InitDFU(instanceId);
    }

    // Stop (pause) DFU process
    // Should do nothing more than pause.
    stopDFU() {

    }

    _getAttributes(deviceInstanceId) {
        return new Promise((resolve, reject) => {
            this._adapter.getAttributes(deviceInstanceId, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })
    }

    _getCharacteristics(serviceUUID, instanceId) {
        return new Promise((resolve, reject) => {
            this._getAttributes(instanceId)
            .then((data) => {
                for (let id in data['services']) {
                    if (data['services'][id].uuid === serviceUUID)
                    {
                        resolve(data['services'][id].characteristics);
                    }
                }
                reject('Could not find service: ' + serviceUUID);
            })
            .catch(err => reject(err));
        });
    }

    _getCharacteristic(characteristics, uuid) {
        for (let id in characteristics) {
            if (characteristics[id].uuid === uuid) {
                return id;
            }
        }
        throw new Error('Could not find characteristic: ' + uuid);
    }


    // Find characteristics,
    // enable notifications,
    // set up progress events,
    _InitDFU(instanceId) {
        // Find characteristics
        // TODO: finish the chain of required steps for
        //       finding the characteristics:
        //       Secure DFU service -> characteristics

        // Find DFU service and characteristics.
        this._getCharacteristics(SECURE_DFU_SERVICE_UUID, instanceId)
        .then(characteristics => {
            this._controlPointCharacteristicId = this._getCharacteristic(characteristics, SECURE_DFU_CONTROL_POINT_UUID);
            this._packetCharacteristicId = this._getCharacteristic(characteristics, SECURE_DFU_PACKET_UUID);

            console.log('Control point characteristic id: ', this._controlPointCharacteristicId);

            this._adapter.startCharacteristicsNotifications(this._controlPointCharacteristicId, false,
              err => {
                if (err) {
                    throw err;
                } else {
                    this._adapter.on('characteristicValueChanged', (characteristic) => {
                        console.log('characteristicValueChanged: ', characteristic);
                        // TODO: probably emit an event depending on what characteristic i notified.
                    });

//                    let command = new Uint8Array([2, 0, 0]);
//                    let command = "asd";
//                    let command = [2, 0, 0];
                    let command = [6, 1];
                    this._sendCommand(command)
                    .catch(err => console.log(err));

                    this.emit('initialized');
                }
            });
        })
        .catch(err => this.emit('error', err));
    }

    // select,
    // create init packet,
    // send init packet,
    // execute
    _sendInitPacket() {

    }

    // select,
    // create init packet,
    // send init packet,
    // execute
    _sendFirmwarePacket() {

    }

    //
    _sendObject() {

    }

    _sendData() {

    }


    _writeCommand(command) {
        return new Promise((resolve, reject) => {
            this._adapter.writeCharacteristicValue(this._controlPointCharacteristicId, command, true, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('_writeCommand done');
                    resolve();
                }
            });
        })
    }


    // Write the characteristic,
    // get the response,
    // check that response is of correct command, and
    // pass response to callback.
    // Callback signature: function(err, response)
    _sendCommand(command) {
        return new Promise((resolve, reject) => {
            this._writeCommand(command)
            .then(() => {
                // TODO: get the response (via notification) and return it,
                //       or fail.
//                this._adapter.once('characteristicValueChanged');
                console.log('command written');
                resolve();
            })
            .catch(err => reject(err))
        })
    }

    _sendExecuteCommand() {

    }

    // Callback signature: function(err, zip) {}
    _loadZip(zipFilePath, callback) {
        // Read zip file
        fs.readFile(zipFilePath, (err, data) => {
            if (err) {
//                this.emit('error', err);
                return callback(err);
            }

            // Get and return zip object
            JSZip.loadAsync(data)
            .then((zip) => {
                callback(undefined, zip);
            })
            .catch((err) => {
//                this.emit('error', err);
                return callback(err);
            })
        })
    }


    // Callback signature: function(err, manifest) {}
    getManifest(zipFilePath, callback) {
        if (zipFilePath === undefined) { throw new Error('Missing argument zipFilePath.'); }
        if ((typeof zipFilePath !== "string") || (!zipFilePath.length)) {
            throw new Error('zipFilePath must be a non-empty string.');
        }

        // Fetch zip object
        this._loadZip(zipFilePath, (err, zip) => {
            if (err) {
//                this.emit('error', err);
                return callback(err);
            }
            // Read out manifest from zip
            zip.file("manifest.json")
            .async("string")
            .then((data) => {
                let manifest;
                try {
                    // Parse manifest as JASON
                    manifest = JSON.parse(data)['manifest'];
                } catch (err) {
//                    this.emit('error', err);
                    return callback(err);
                }
                // Return manifest
                return callback(undefined, manifest);
            }, (err) => {
//                this.emit('error', err);
                return callback(err);
            });
        })
    }

    /* Manifest object format:
    Consists of one or more properties whose name is one of:
        application
        bootloader
        softdevice
        softdevice_bootloader
    Each of the above properties is a firmware object, on the format:
        {bin_file: <binfile>,   // Name of file containing firmware.
         dat_file: <datfile>}   // Name of file containing init packet.
    A firmware object named softdevice_bootloader has one additional property:
        info_read_only_metadata: {
            bl_size: <blsize>,    // Size of bootloader.
            sd_size: <sdsize>}    // Size of softdevice.
    */
}

module.exports = Dfu;
