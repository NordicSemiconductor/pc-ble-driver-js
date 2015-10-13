'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');
/*
var adapterFactory = proxyquire('../../api/adapterFactory.js', 
    { 
        './adapter' : 
        {
            
        }
    });*/
//import adapterFactory from '../../api/adapterFactory.js';
var adapterFactory = require('../../api/adapterFactory.js');


describe('Array', function() {
    var bleDriver;
    beforeEach(function() {
        bleDriver = 
        {
            get_adapters: sinon.stub(),
        };
        bleDriver.get_adapters.yields(undefined, [{serialNumber: 'test1234', comNumber: '5'}]);
    });
  
    it('should provide callback with list of adapters received from driver', function () {
        let adapterFactoryInstance = new adapterFactory(bleDriver);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 1);
        console.log(adapters);
    });

});
