'use strict';

const sinon = require('sinon');
const assert = require('assert');

const proxyquire = require('proxyquire');
const commonStubs = require('./commonStubs');

const api = require('../../index').api;

describe('AdapterFactory', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        // Provide an empty array adapters for the first call
        this.bleDriver.get_adapters.yields(undefined, []);
        this.adapterFactory = new api.AdapterFactory(this.bleDriver);

        this.addedSpy = sinon.spy();
        this.removedSpy = sinon.spy();
        this.errorSpy = sinon.spy();

        this.adapterFactory.on('added', this.addedSpy);
        this.adapterFactory.on('removed', this.removedSpy);
        this.adapterFactory.on('error', this.errorSpy);
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('should provide a list of adapters connected to the computer', function() {
        var adapters = this.adapterFactory.getAdapters((err, adapters) => {
            assert.ifError(err);
            assert(Object.keys(adapters).length === 0, 'Should not be any adapters here yet.');
        });
    });

    it('should provide an event when a new adapter is added to the computer', function() {
        this.bleDriver.get_adapters.yields(undefined,
                    [{ serialNumber: 'test2222', comName: '6' }]);

        this.adapterFactory.getAdapters((err, adapters) => {
            assert.ifError(err);
            sinon.assert.calledOnce(this.addedSpy);
            sinon.assert.notCalled(this.removedSpy);
            sinon.assert.notCalled(this.errorSpy);
            assert.equal(Object.keys(adapters).length, 1);
        });
    });

    it('should provide an event when an adapter is removed from the computer', function() {
        var adapterA = { serialNumber: 'test1234', comName: '5' };
        this.bleDriver.get_adapters.yields(undefined, [adapterA]);

        this.adapterFactory.getAdapters(err => {
            assert.ifError(err);
        });

        this.bleDriver.get_adapters.yields(undefined, []);

        this.addedSpy.reset();
        this.removedSpy.reset();
        this.errorSpy.reset();

        this.adapterFactory.getAdapters((err, adapters) => {
            assert.ifError(err);
            assert.equal(Object.keys(adapters).length, 0, 'There should be no adapters attached to the computer now.');
        });

        sinon.assert.notCalled(this.addedSpy);
        sinon.assert.calledOnce(this.removedSpy);
        sinon.assert.notCalled(this.errorSpy);
    });
});
