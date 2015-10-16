'use strict';

const  sinon = require('sinon');
const assert = require('assert');
const commonStubs = require('./commonStubs.js');

const Adapter = require('../../api/adapter.js');


describe('Adapter Connect', function() {
    let bleDriver, adapter;
    beforeEach(function() {
        bleDriver = commonStubs.createBleDriver(); //createAndSetupBleDriverStub();
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
        bleDriver = commonStubs.createBleDriver();
        
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
     let bleDriver, adapter;

    beforeEach(function() {
        bleDriver = commonStubs.createBleDriver();
        
        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter._devices['myDeviceId'] = {connectionHandle: '1234'};
    });

    it('should call bleDriver disconnect with the connectionHandle of the device identified by deviceId', function(done) {
        adapter.disconnect('myDeviceId', (error) => {
            let args = bleDriver.gap_disconnect.lastCall.args;
            assert.equal(args[0], '1234');

            done();
        });
    });

    it('should emit and pass error if disconnect fails', function(done) {
        bleDriver.gap_disconnect.yieldsAsync('err');
        let errorSubscriber = sinon.spy();
        adapter.once('error', errorSubscriber);

        adapter.disconnect('myDeviceId', (error) => {
            assert.equal(error, 'err');

            assert(errorSubscriber.calledOnce);
            done();
        });
    });
});

describe('Adapter updateConnParams', () => {
    beforeEach(function() {
        bleDriver = createAndSetupBleDriverStub();
        adapter = new Adapter(bleDriver, 'theId', 42);

        // Insert device
        // call updateConnParams
        // verify that driver was called with correct params.
        // verify that error is called if failed.

    });

});
