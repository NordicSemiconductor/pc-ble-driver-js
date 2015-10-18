'use strict';

const  sinon = require('sinon');
const assert = require('assert');

const Adapter = require('../../api/adapter.js');
const commonStubs = require('./commonStubs.js');


describe('BLE_GAP_EVT_CONNECTED', function() {
    let bleDriver, adapter, bleDriverEventCallback = {}, connectEvent;

    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback)=>{
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
        
        bleDriverEventCallback([connectEvent]);

        assert(connectSpy.calledOnce);
    });

    it('should populate the adapters list of devices', () =>{
        bleDriverEventCallback([connectEvent]);

        let devices = adapter.getDevices();
        let addedDevice = devices['FF:AA:DD.123'];
        assert.notEqual(addedDevice, undefined);
    });

    it('should produce a device connected event with data from connect event', () =>{
        let connectSpy = sinon.spy();
        adapter.once('deviceConnected', connectSpy);
        
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
});

describe('BLE_GAP_EVT_DISCONNECTED', function() {
    let bleDriver, adapter, bleDriverEventCallback, disconnectEvent;
    beforeEach((done) => {
        bleDriver = commonStubs.createBleDriver((eventCallback)=>{
            bleDriverEventCallback = eventCallback;
            bleDriverEventCallback([commonStubs.createConnectEvent()]);

            disconnectEvent = {
                id: bleDriver.BLE_GAP_EVT_DISCONNECTED,
                conn_handle: 123,
                reason_name: "BLE_HCI_LOCAL_HOST_TERMINATED_CONNECTION"
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
        const connectEvent = commonStubs.createConnectEvent();
        bleDriverEventCallback([connectEvent]);
        const newConnectionParamerers = {
            minConnectionInterval: 32,
            maxConnectionInterval: 124,
            slaveLatency: 15,
            connectionSupervisionTimeout: 34,
        };
        const originalDevice = adapter.getDevices()['FF:AA:DD.123'];
        assert.equal(originalDevice.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(originalDevice.maxConnectionInterval, connectEvent.conn_params.max_conn_interval);
        assert.equal(originalDevice.slaveLatency, connectEvent.conn_params.slave_latency);
        assert.equal(originalDevice.connectionSupervisionTimeout, connectEvent.conn_params.conn_sup_timeout);

        bleDriverEventCallback([commonStubs.createConnectionParametersUpdateEvent()]);
        const updatedDevice = adapter.getDevices()['FF:AA:DD.123'];

        assert.equal(updatedDevice.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(updatedDevice.maxConnectionInterval, connectEvent.conn_params.max_conn_interval);
        assert.equal(updatedDevice.slaveLatency, connectEvent.conn_params.slave_latency);
        assert.equal(updatedDevice.connectionSupervisionTimeout, connectEvent.conn_params.conn_sup_timeout);        
    });

    it('should emit \'connParamUpdate\'');

    it('should emit error if device is not ');
});