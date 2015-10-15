'use strict';

var  sinon = require('sinon');
var assert = require('assert');

const Adapter = require('../../api/adapter.js');

describe('Adapter', function() {
    let bleDriver;
    beforeEach(function() {
        bleDriver = 
        {
            gap_connect: sinon.stub(),
            get_version: sinon.stub(),
            gap_get_device_name: sinon.stub(),
            gap_get_address: sinon.stub()
        };

    });
    it('should change adapter state to "connecting" after connect', function(done){
        let adapter = new Adapter(bleDriver, 'theId', 43);
        bleDriver.gap_connect.yields(undefined);
        bleDriver.get_version.yields('0.0.9', undefined);
        bleDriver.gap_get_device_name.yields('holy handgrenade', undefined);
        bleDriver.gap_get_address.yields('Bridge of death', undefined);
        
        adapter.connect("deviceAddress", {}, function(){
            adapter.getAdapterState( (error, adapterState) => {
                assert.equal(adapterState.connecting, true);
                done();
            });
        });
    });

    it('should set driver version, device name and address on connect', function(done) {
        let adapter = new Adapter(bleDriver, 'theId', 42);
        bleDriver.gap_connect.yields(undefined);
        bleDriver.get_version.yields('0.0.9', undefined);
        bleDriver.gap_get_device_name.yields('holy handgrenade', undefined);
        bleDriver.gap_get_address.yields('Bridge of death', undefined);
        adapter.connect("deviceAddress", {}, function() {
            adapter.getAdapterState( (error, adapterState) => {
                assert.equal(adapterState.firmwareVersion, '0.0.9');
                assert.equal(adapterState.deviceName, 'holy handgrenade');
                assert.equal(adapterState.address, 'Bridge of death');
                done();
            });
        });
    });
});