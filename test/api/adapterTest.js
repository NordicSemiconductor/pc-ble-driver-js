'use strict';

var  sinon = require('sinon');
var assert = require('assert');

const Adapter = require('../../api/adapter.js');

describe('Adapter Connect', function() {
    let bleDriver, adapter;
    beforeEach(function() {
        bleDriver =
        {
            gap_connect: sinon.stub(),
            get_version: sinon.stub(),
            gap_get_device_name: sinon.stub(),
            gap_get_address: sinon.stub()
        };
        bleDriver.gap_connect.yields(undefined);
        bleDriver.get_version.yields('0.0.9', undefined);
        bleDriver.gap_get_device_name.yieldsAsync('holy handgrenade', undefined);
        bleDriver.gap_get_address.yieldsAsync('Bridge of death', undefined);
        adapter = new Adapter(bleDriver, 'theId', 42);
    });

    it('should change adapter state to "connecting" after connect', function(done){
        adapter.connect('deviceAddress', {}, function(){
            adapter.getAdapterState( (error, adapterState) => {
                assert.equal(adapterState.connecting, true);
                done();
            });
        });
    });

    it('should set driver version, device name and address on connect', function(done) {
        adapter.connect('deviceAddress', {}, function() {
            adapter.getAdapterState( (error, adapterState) => {
                assert.equal(adapterState.firmwareVersion, '0.0.9');
                assert.equal(adapterState.name, 'holy handgrenade');
                assert.equal(adapterState.address, 'Bridge of death');
                done();
            });
        });
    });

    it('should connect to the device with address given to connect', function(done) {
        adapter.connect('deviceAddress', {}, () =>{
             assert(bleDriver.gap_connect.calledWith("deviceAddress"));
             done();
        });
    });

    it('should emit error if gap_connect fails', function(done) {
        bleDriver.gap_connect.yieldsAsync('Error');
        let errorSpy = sinon.spy();
        adapter.on('error', errorSpy);

        adapter.connect('deviceAddress', {}, (error) => {
            assert(errorSpy.calledOnce);
            done();
        });
    });
});

describe('Adapter Cancel connect', function(){
    let bleDriver, adapter;

    beforeEach(function() {
        bleDriver =
        {
            gap_connect: sinon.stub(),
            gap_cancel_connect: sinon.stub(),
        };
        bleDriver.gap_connect.yields(undefined);
        bleDriver.gap_cancel_connect.yields(undefined);
        adapter = new Adapter(bleDriver, 'theId', 42);
    });

    it('should call bleDriver cancel connect', (done) =>{
        adapter.cancelConnect(() =>{
            assert(bleDriver.gap_cancel_connect.calledOnce);
            done();
        });
    });

    it('should update adapter state after cancelling connect', (done) =>{
        adapter.connect('deviceAddress', {}, (error) =>{
            assert(!error);
            assert.equal(adapter._adapterState.connecting, true);
            adapter.cancelConnect((error)=>{
                assert(!error);
                assert.equal(adapter._adapterState.connecting, false);
                done();
            });

        });
    });

    it('should emit adapterStateChanged on cancelConnect', (done) => {
        adapter.once('adapterStateChanged', (change) => {
            assert.equal(change.scanning, false);
            assert.equal(change.connecting, true);
        });

        adapter.connect('deviceAddress', {}, (error) =>{
            assert(!error);
            adapter.once('adapterStateChanged', (change) => {
                assert.equal(change.connecting, false);
            });
            adapter.cancelConnect( (error) =>{
                assert(!error);
                done();
            });

        });
    });
});

describe('Adapter disconnect', function(){

});
