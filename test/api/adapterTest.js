'use strict';

const  sinon = require('sinon');
const assert = require('assert');
const commonStubs = require('./commonStubs.js');

const Adapter = require('../../api/adapter.js');
const Characteristic = require('../../api/characteristic.js');
const Descriptor = require('../../api/descriptor.js');

describe('Adapter Connect', function() {
    let bleDriver;
    let adapter;
    beforeEach(function() {
        bleDriver = commonStubs.createBleDriver(); //createAndSetupBleDriverStub();
        adapter = new Adapter(bleDriver, 'theId', 42);
    });

    it('should put a callback into gapOperationsMap', () => {
        adapter.connect('deviceAddress', {}, () => {});
        assert(adapter._gapOperationsMap.connecting);
        assert.equal(typeof adapter._gapOperationsMap.connecting.callback, 'function');
    });

    it('should change adapter state to "connecting" after connect', (done) => {
        adapter.connect('deviceAddress', {}, () => {});
        adapter.getAdapterState((error, adapterState) => {
            assert.equal(adapterState.connecting, true);
            done();
        });
    });

    it('should connect to the device with address given to connect', () => {
        adapter.connect('deviceAddress', {}, () => {});
        assert(bleDriver.gap_connect.calledWith('deviceAddress'));
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

    it('should not allow starting another connect before connect response has been received', (done) => {
        const errorSpy = sinon.spy();
        adapter.once('error', errorSpy);
        adapter.connect('device1', {}, () => {});
        console.log('device 1');
        adapter.connect('device2', {}, (error) => {
            assert(error);
            done();
        });
    });
});

describe('Adapter Cancel connect', () => {
    let bleDriver;
    let adapter;

    beforeEach(function() {
        bleDriver = commonStubs.createBleDriver();

        adapter = new Adapter(bleDriver, 'theId', 42);
    });

    it('should call bleDriver cancel connect', () => {
        adapter.cancelConnect(() =>{});
        assert(bleDriver.gap_cancel_connect.calledOnce);
    });

    it('should update adapter state after cancelling connect', (done) => {
        adapter._adapterState.connecting = true;
        adapter.cancelConnect((error)=> {
            assert(!error);
            assert.equal(adapter._adapterState.connecting, false);
            done();
        });
    });

    it('should emit adapterStateChanged on cancelConnect', (done) => {
        let adapterStateChangedWasCalled = false;
        adapter.once('adapterStateChanged', (change) => {
            assert.equal(change.scanning, false);
            assert.equal(change.connecting, true);
            adapterStateChangedWasCalled = true;
        });

        adapter.connect('deviceAddress', {}, () => {});
        assert(adapterStateChangedWasCalled);
        adapterStateChangedWasCalled = false;
        adapter.once('adapterStateChanged', (change) => {
            assert.equal(change.connecting, false);
            adapterStateChangedWasCalled = true;
        });
        adapter.cancelConnect((error) => {
            assert(!error);
            assert(adapterStateChangedWasCalled);
            done();
        });
    });

    it('should emit error if gap_cancel_connect fails', (done) => {
        let errorSpy = sinon.spy();
        adapter.once('error', errorSpy);

        bleDriver.gap_cancel_connect.yieldsAsync('Error');
        adapter.cancelConnect(() => {
            assert(errorSpy.calledOnce);
            done();
        });
    });

    it('should remove any pending \'connects\' from gapOperationsMap', (done) => {
        adapter.connect('deviceAddress', {}, () => {});
        assert(adapter._gapOperationsMap.hasOwnProperty('connecting'));
        adapter.cancelConnect((error)=> {
            assert(!error);
            assert(!adapter._gapOperationsMap.hasOwnProperty('connecting'));
            done();
        });
    });
});

describe('Adapter disconnect', () => {
    let bleDriver;
    let adapter;

    beforeEach(function() {
        bleDriver = commonStubs.createBleDriver();

        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter._devices.myDeviceId = {connectionHandle: '1234'};
    });

    it('should call bleDriver disconnect with the connectionHandle of the device identified by deviceId', () => {
        adapter.disconnect('myDeviceId', () => {});
        let args = bleDriver.gap_disconnect.lastCall.args;
        assert.equal(args[0], '1234');
    });

    it('should put a callback into gapOperationsMap', () => {
        adapter._devices.deviceId = {};
        adapter.disconnect('deviceId', () => {});
        assert(adapter._gapOperationsMap.hasOwnProperty('deviceId'));
        assert.equal(typeof adapter._gapOperationsMap.deviceId.callback, 'function');
    });

    it('should emit and pass error if disconnect fails', function(done) {
        bleDriver.gap_disconnect.yieldsAsync('err');
        let errorSubscriber = sinon.spy();
        adapter.once('error', errorSubscriber);

        adapter.disconnect('myDeviceId', (error) => {
            assert.equal(error.description, 'err');

            assert(errorSubscriber.calledOnce);
            done();
        });
    });
});

function createConnectionUpdateParameters() {
    return {
        minConnectionInterval: 100,
        maxConnectionInterval: 200,
        slaveLatency: 20,
        connectionSupervisionTimeout: 1000,
    };
}

describe('Adapter updateConnParams', () => {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback;
    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback) => {
            bleDriverEventCallback = eventCallback;
            done();
        });
        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, (err) => {
            assert.ifError(err);
        });
    });

    it('should call bleDriver with the passed parameters', (done) => {
        bleDriver.gap_update_connection_parameters.yieldsAsync(undefined);
        adapter.once('deviceConnected', (device) => {
            console.log('cc');
            const connectionUpdateParameters = createConnectionUpdateParameters();
            adapter.updateConnParams(device.instanceId, connectionUpdateParameters, (error) => {
                assert(!error);
                const args = bleDriver.gap_update_connection_parameters.args[0];
                assert.equal(args[0], 123);
                assert.equal(args[1].min_conn_interval, connectionUpdateParameters.minConnectionInterval);
                assert.equal(args[1].max_conn_interval, connectionUpdateParameters.maxConnectionInterval);
                assert.equal(args[1].slave_latency, connectionUpdateParameters.slaveLatency);
                assert.equal(args[1].conn_sup_timeout, connectionUpdateParameters.connectionSupervisionTimeout);

                done();
            });
        });
        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([commonStubs.createConnectEvent()]);
    });

    it('should emit error and pass \'error\' if call to gap_update_connection_parameters fails', (done) => {
        let errorSpy = sinon.spy();
        adapter.once('error', errorSpy);
        bleDriver.gap_update_connection_parameters.yieldsAsync('err');
        adapter.on('deviceConnected', (device) => {
            const connectionUpdateParameters = createConnectionUpdateParameters();
            adapter.updateConnParams(device.instanceId, connectionUpdateParameters, (error) => {
                assert(error);
                assert(errorSpy.calledOnce);
                done();
            });
        });
        adapter.connect('ss', {}, () => {});
        bleDriverEventCallback([commonStubs.createConnectEvent()]);
    });

    it('should throw if no connection handle is found', () => {
        function callUpdateConnParams() {
            adapter.updateConnParams(device.instanceId, connectionUpdateParameters, () => {});
        }

        assert.throws(callUpdateConnParams, Error);
    });
});

describe('Adapter start characteristics notification', () => {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback;
    let characteristic;
    let cccdDescriptor;
    const cccdUuid = '2902';
    beforeEach(()=> {
        bleDriver = commonStubs.createBleDriver(() => {});
        adapter = new Adapter(bleDriver, 'theId', 42);
        characteristic = new Characteristic('dummyServiceId', 'ffaabb', [], {});
        adapter._characteristics[characteristic.instanceId] = characteristic;
        cccdDescriptor = new Descriptor(characteristic.instanceId, cccdUuid, 42);
        adapter._descriptors[cccdDescriptor.instanceId] = cccdDescriptor;
    });

    it('Should call adapter writeDescriptorValue with the right parameters', (done)=> {
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync(undefined);
        adapter.startCharacteristicsNotifications(characteristic.instanceId, false, ()=> {
            const args = adapter.writeDescriptorValue.lastCall.args;
            assert.equal(args[0], cccdDescriptor.instanceId);
            assert.deepEqual(args[1], [1, 0]);
            assert.equal(args[2], true);
            done();
        });
    });

    it('Should call adapter writeDescriptorValue with the right parameters for ack', (done)=> {
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync(undefined);
        adapter.startCharacteristicsNotifications(characteristic.instanceId, true, ()=> {
            const args = adapter.writeDescriptorValue.lastCall.args;
            assert.deepEqual(args[1], [2, 0]);
            done();
        });
    });

    it('should emit error and pass error to callback if writeDescriptorValue fails', (done) => {
        const errorSpy = sinon.spy();
        adapter.once('error', errorSpy);
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync('some error');
        adapter.startCharacteristicsNotifications(characteristic.instanceId, true, (theError)=> {
            assert(errorSpy.calledOnce);
            assert.equal(theError, 'some error');
            done();
        });
    });

    it('should throw if there is no CCCD descriptor within the characteristic', () => {
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync(undefined);
        cccdDescriptor.uuid = 'notTheCccdUuid';
        function callStartCharacteristicsNotification() {
            adapter.startCharacteristicsNotifications(characteristic.instanceId, true, () => {});
        }

        assert.throws(callStartCharacteristicsNotification);
    });

});

describe('Adapter start characteristics notification', () => {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback;
    let characteristic;
    let cccdDescriptor;
    const cccdUuid = '2902';
    beforeEach(()=> {
        bleDriver = commonStubs.createBleDriver(() => {});
        adapter = new Adapter(bleDriver, 'theId', 42);
        characteristic = new Characteristic('dummyServiceId', 'ffaabb', [], {});
        adapter._characteristics[characteristic.instanceId] = characteristic;
        cccdDescriptor = new Descriptor(characteristic.instanceId, cccdUuid, 42);
        adapter._descriptors[cccdDescriptor.instanceId] = cccdDescriptor;
    });

    it('should call adapter writeDescriptorValue with the correct arguments', (done) => {
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync(undefined);
        adapter.stopCharacteristicsNotifications(characteristic.instanceId, () => {
            const args = adapter.writeDescriptorValue.lastCall.args;
            assert.equal(args[0], cccdDescriptor.instanceId);
            assert.deepEqual(args[1], [0, 0]);
            done();
        });
    });

    it('should emit error and pass error to callback if writeDescriptorValue fails', (done) => {
        const errorSpy = sinon.spy();
        adapter.once('error', errorSpy);
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync('some error');
        adapter.stopCharacteristicsNotifications(characteristic.instanceId, (theError) => {
            assert(errorSpy.calledOnce);
            assert.equal(theError, 'some error');
            done();
        });
    });

    it('should throw if there is no CCCD descriptor within the characteristic', () => {
        adapter.writeDescriptorValue = sinon.stub();
        adapter.writeDescriptorValue.yieldsAsync(undefined);
        cccdDescriptor.uuid = 'notTheCccdUuid';
        function callStartCharacteristicsNotification() {
            adapter.stopCharacteristicsNotifications(characteristic.instanceId, true, ()=> {});
        }

        assert.throws(callStartCharacteristicsNotification);
    });
});

