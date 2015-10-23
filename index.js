var driver = require('bindings')('ble_driver_js');
var Adapter = require('./api/adapter');
var AdapterFactory = require('./api/adapterFactory');
var AdapterState = require('./api/AdapterState');
var Characteristic = require('./api/characteristic');
var Descriptor = require('./api/descriptor');
var Device = require('./api/device');
var Service = require('./api/Service');
var ServiceFactory = require('./api/ServiceFactory');


module.exports.driver = require('bindings')('ble_driver_js');
module.exports.api = {
    Adapter,
    AdapterFactory,
    AdapterState,
    Characteristic,
    Descriptor,
    Device,
    Service,
    ServiceFactory
};
