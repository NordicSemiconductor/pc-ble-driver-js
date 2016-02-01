var driver = require('bindings')('pc-ble-driver-js');
var Adapter = require('./api/adapter');
var AdapterFactory = require('./api/adapterFactory');
var AdapterState = require('./api/adapterState');
var Characteristic = require('./api/characteristic');
var Descriptor = require('./api/descriptor');
var Device = require('./api/device');
var Service = require('./api/service');
var ServiceFactory = require('./api/serviceFactory');

module.exports.driver = require('bindings')('pc-ble-driver-js');
module.exports.api = {
    Adapter,
    AdapterFactory,
    AdapterState,
    Characteristic,
    Descriptor,
    Device,
    Service,
    ServiceFactory,
};
