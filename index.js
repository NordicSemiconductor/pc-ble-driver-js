/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

var driver = require('bindings')('pc-ble-driver-js');
var Adapter = require('./api/adapter');
var AdapterFactory = require('./api/adapterFactory');
var AdapterState = require('./api/adapterState');
var Characteristic = require('./api/characteristic');
var Descriptor = require('./api/descriptor');
var Device = require('./api/device');
var Security = require('./api/security');
var Service = require('./api/service');
var ServiceFactory = require('./api/serviceFactory');

module.exports.driver = driver;
module.exports.api = {
    Adapter,
    AdapterFactory,
    AdapterState,
    Characteristic,
    Descriptor,
    Device,
    Security,
    Service,
    ServiceFactory,
};
