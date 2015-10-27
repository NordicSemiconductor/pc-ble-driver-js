'use strict';

const  sinon = require('sinon');
const assert = require('assert');

const Adapter = require('../../api/adapter.js');
const commonStubs = require('./commonStubs.js');

describe('BLE_GAP_EVT_CONNECTED', function() {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback = {};
    let connectEvent;

    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback)=> {
            bleDriverEventCallback = eventCallback;
            connectEvent = commonStubs.createConnectEvent();
            done();
        });

        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, err => {
            assert.ifError(err);
        });
    });

    it('should produce a deviceConnected event', () => {
        let connectSpy = sinon.spy();
        adapter.once('deviceConnected', connectSpy);

        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([connectEvent]);

        assert(connectSpy.calledOnce);
    });

    it('should populate the adapters list of devices', () => {
        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([connectEvent]);

        let devices = adapter.getDevices();
        let addedDevice = devices['FF:AA:DD.123'];
        assert.notEqual(addedDevice, undefined);
    });

    it('should produce a device connected event with data from connect event', () => {
        let connectSpy = sinon.spy();
        adapter.once('deviceConnected', connectSpy);

        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([connectEvent]);
        let device = connectSpy.args[0][0];

        assert.equal(device._instanceId, 'FF:AA:DD.123');
        assert.equal(device._address, 'FF:AA:DD');
        assert.equal(device._role, 'peripheral');
        assert.equal(device.connected, true);
        assert.equal(device._connectionHandle, connectEvent.conn_handle);
        assert.equal(device.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(device.maxConnectionInterval, connectEvent.conn_params.max_conn_interval);
        assert.equal(device.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(device.slaveLatency, connectEvent.conn_params.slave_latency);
        assert.equal(device.connectionSupervisionTimeout, connectEvent.conn_params.conn_sup_timeout);
        assert(connectSpy.calledOnce);
    });

    it('should set driver version, device name and address on connect', (done) => {
        adapter.connect('deviceAddress', {}, () => {
            adapter.getAdapterState((error, adapterState) => {
                assert.equal(adapterState.firmwareVersion, '0.0.9');
                assert.equal(adapterState.name, 'holy handgrenade');
                assert.equal(adapterState.address, 'Bridge of death');
                done();
            });
        });
        bleDriverEventCallback([connectEvent]);
    });
});

describe('BLE_GAP_EVT_DISCONNECTED', function() {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback;
    let disconnectEvent;
    beforeEach((done) => {
        bleDriver = commonStubs.createBleDriver((eventCallback)=> {
            bleDriverEventCallback = eventCallback;
            adapter.connect('ss', {}, ()=> {});
            bleDriverEventCallback([commonStubs.createConnectEvent()]);

            disconnectEvent = {
                id: bleDriver.BLE_GAP_EVT_DISCONNECTED,
                conn_handle: 123,
                reason_name: "BLE_HCI_LOCAL_HOST_TERMINATED_CONNECTION",
            };
            done();
        });

        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, err => {
            assert.ifError(err);
        });
    });

    it ('should produce a deviceDisconnected event with the disconnected device', () => {
        let disconnectSpy = sinon.spy();
        adapter.once('deviceDisconnected', disconnectSpy);

        bleDriverEventCallback([disconnectEvent]);

        assert(disconnectSpy.calledOnce);
        let device = disconnectSpy.args[0][0];
        assert.equal(device._instanceId, 'FF:AA:DD.123');
    });

    it ('should remove the disconnected event from the adapter', () =>{
        let devices = adapter.getDevices();
        assert.equal(devices['FF:AA:DD.123'].connected, true);

        bleDriverEventCallback([disconnectEvent]);
        devices = adapter.getDevices();
        assert.deepEqual(devices, {});
    });
});

describe('BLE_GAP_EVT_CONN_PARAM_UPDATE', () =>{
    let bleDriver, adapter, bleDriverEventCallback;
    beforeEach((done) =>{
        bleDriver = commonStubs.createBleDriver( (eventCallback) => {
            bleDriverEventCallback = eventCallback;
            done();
        });
        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, err => {
            assert.ifError(err);
        });
    });

    it('Should update device connection parameters', () => {
        let connectEvent = commonStubs.createConnectEvent();
        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([connectEvent]);

        const originalDevice = adapter.getDevices()['FF:AA:DD.123'];
        assert.equal(originalDevice.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(originalDevice.maxConnectionInterval, connectEvent.conn_params.max_conn_interval);
        assert.equal(originalDevice.slaveLatency, connectEvent.conn_params.slave_latency);
        assert.equal(originalDevice.connectionSupervisionTimeout, connectEvent.conn_params.conn_sup_timeout);

        const newConnectionParameters = {
            min_conn_interval: 32,
            max_conn_interval: 124,
            slave_latency: 15,
            conn_sup_timeout: 34,
        };
        let connectionUpdateEvent = commonStubs.createConnectionParametersUpdateEvent();
        connectionUpdateEvent.conn_params = newConnectionParameters;
        bleDriverEventCallback([connectionUpdateEvent]);
        const updatedDevice = adapter.getDevices()['FF:AA:DD.123'];

        assert.equal(updatedDevice.minConnectionInterval, newConnectionParameters.min_conn_interval);
        assert.equal(updatedDevice.maxConnectionInterval, newConnectionParameters.max_conn_interval);
        assert.equal(updatedDevice.slaveLatency, newConnectionParameters.slave_latency);
        assert.equal(updatedDevice.connectionSupervisionTimeout, newConnectionParameters.conn_sup_timeout);
    });

    it('should emit \'connParamUpdate\' with the correct device and with the new conn params', () => {
        const connectEvent = commonStubs.createConnectEvent();
        adapter.connect('ss', {}, ()=> {});
        bleDriverEventCallback([connectEvent]);

        const newConnectionParameters = {
            min_conn_interval: 32,
            max_conn_interval: 124,
            slave_latency: 15,
            conn_sup_timeout: 34,
        };
        let connectionUpdateEvent = commonStubs.createConnectionParametersUpdateEvent();
        connectionUpdateEvent.conn_params = newConnectionParameters;

        let updateSpy = sinon.spy();
        adapter.once('connParamUpdate', updateSpy);
        bleDriverEventCallback([connectionUpdateEvent]);

        assert(updateSpy.calledOnce);
        let updatedDevice = updateSpy.args[0][0];
        assert.equal(updatedDevice.minConnectionInterval, newConnectionParameters.min_conn_interval);
        assert.equal(updatedDevice.maxConnectionInterval, newConnectionParameters.max_conn_interval);
        assert.equal(updatedDevice.slaveLatency, newConnectionParameters.slave_latency);
        assert.equal(updatedDevice.connectionSupervisionTimeout, newConnectionParameters.conn_sup_timeout);
    });

    it('should emit only error if device is not found', () =>{
        let connectionUpdateEvent = commonStubs.createConnectionParametersUpdateEvent();
        let updateSpy = sinon.spy();
        let errorSpy = sinon.spy();

        adapter.once('connParamUpdate', updateSpy);
        adapter.once('error', errorSpy);
        bleDriverEventCallback([connectionUpdateEvent]);
        assert(errorSpy.calledOnce);
        assert(!updateSpy.called);
    });
});

describe('BLE_GATTC_EVT_HVX', () => {
    let bleDriver, adapter, bleDriverEventCallback;
    beforeEach((done) => {
        bleDriver = commonStubs.createBleDriver( (eventCallback) => {
            bleDriverEventCallback = eventCallback;
            done();
        });
        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, err =>{
            assert.ifError(err);
        });
    });

    it('should emit \'characteristicValueChanged\' with the right parameters', () => {
        let hvxEvent = commonStubs.createHvxEvent(false);
        let hvxSpy = sinon.spy();
        let errorSpy = sinon.spy();
        adapter.once('characteristicValueChanged', hvxSpy);
        adapter.once('error', errorSpy);
        adapter._characteristics['dummyId'] = {
            valueHandle: hvxEvent.handle,
        };
        
        bleDriverEventCallback([hvxEvent]);

        assert(!errorSpy.calledOnce);
        assert(hvxSpy.calledOnce);
        const characteristic = hvxSpy.lastCall.args[0];
        assert.equal(characteristic.valueHandle, hvxEvent.handle);
        assert.deepEqual(characteristic.value, hvxEvent.data);
    });

    it('should call gattc_confirm_handle_value if the event type is HVX_INDICATION', () => {
        let hvxEvent = commonStubs.createHvxEvent(true);
        let hvxSpy = sinon.spy();
        let errorSpy = sinon.spy();
        adapter.once('characteristicValueChanged', hvxSpy);
        adapter.once('error', errorSpy);
        adapter._characteristics['dummyId'] = {
            valueHandle: hvxEvent.handle,
        };
        
        bleDriverEventCallback([hvxEvent]);

        assert(!errorSpy.calledOnce);
        assert(hvxSpy.calledOnce);
        assert(bleDriver.gattc_confirm_handle_value.calledOnce);

    });

    it('should emit error if there is no characteristic with valueHandle equal to descriptor handle', () => {
        let hvxEvent = commonStubs.createHvxEvent(false);
        let hvxSpy = sinon.spy();
        let errorSpy = sinon.spy();
        adapter.once('characteristicValueChanged', hvxSpy);
        adapter.once('error', errorSpy);

        bleDriverEventCallback([hvxEvent]);

        assert(errorSpy.calledOnce);
    });


});
