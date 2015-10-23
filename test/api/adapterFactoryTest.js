'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var api = require('../../index').api;
var driver = require('../../index').driver;

describe('AdapterFactory', function() {
/*    var bleDriver;

    var addedSpy;
    var removedSpy;
    var errorSpy;

    var adapterFactoryInstance;*/

    beforeEach(function() {
        console.log('beforeEach called');

        this.clock = sinon.useFakeTimers();

        this.bleDriver =
        {
            get_adapters: sinon.stub()
        };

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

    it('should provide a list of adapters connected to the computer', function () {
        var adapters = this.adapterFactory.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });

    it('should provide an event when a new adapter is added to the computer', function() {
        this.bleDriver.get_adapters.yields(undefined,
                    [{ serialNumber: 'test2222', comName: '6' }]);

        this.clock.tick(5001);

        sinon.assert.calledOnce(this.addedSpy);
        sinon.assert.notCalled(this.removedSpy);
        sinon.assert.notCalled(this.errorSpy);

        var adapters = this.adapterFactory.getAdapters();
        assert.equal(Object.keys(adapters).length, 1);
    });

    it('should provide an event when an adapter is removed from the computer', function() {
        var adapterA = { serialNumber: 'test1234', comName: '5' };
        this.bleDriver.get_adapters.yields(undefined, [adapterA]);

        this.clock.tick(5001);

        this.bleDriver.get_adapters.yields(undefined, []);

        this.addedSpy.reset();
        this.removedSpy.reset();
        this.errorSpy.reset();

        this.clock.tick(5001);

        sinon.assert.notCalled(this.addedSpy);
        sinon.assert.calledOnce(this.removedSpy);
        sinon.assert.notCalled(this.errorSpy);

        var adapters = this.adapterFactory.getAdapters();
        assert.equal(Object.keys(adapters).length, 0);
    });
});

