'use strict';

var assert = require('chai').assert;
var keypress = require('keypress');
var sinon = require('sinon');

keypress(process.stdin);

var api = require('../../index').api;
var driver = require('../../index').driver;

var adapterFactoryInstance = new api.AdapterFactory(driver);

var addedSpy = sinon.spy();
var removedSpy = sinon.spy();
var errorSpy = sinon.spy();

adapterFactoryInstance.on('added', addedSpy);
adapterFactoryInstance.on('removed', removedSpy);
adapterFactoryInstance.on('error', errorSpy);

const adapterFactoryUpdateInterval = 5000;

console.log('Insert only one SEGGER device into the computer and press 1');

process.stdin.on('keypress', function(ch, key) {
    if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        return;
    }

    if(ch) {
        switch(ch) {
            case '1':
                var adapters = adapterFactoryInstance.getAdapters();
                assert.lengthOf(Object.keys(adapters), 1);
                console.log('Insert one additional SEGGER device into the computer and press 2');
                break;
            case '2':
                sinon.assert.calledOnce(addedSpy);
                sinon.assert.notCalled(removedSpy);
                sinon.assert.notCalled(errorSpy);
                addedSpy.reset();
                removedSpy.reset();
                errorSpy.reset();
                console.log('Remove the last added SEGGER device into the computer and press 3');
            case '3':
                sinon.assert.notCalled(addedSpy);
                sinon.assert.calledOnce(removedSpy);
                sinon.assert.notCalled(errorSpy);
                addedSpy.reset();
                removedSpy.reset();
                errorSpy.reset();
                break;
            default:
                console.log('Unknown key pressed!');
                break;
        }
    }
});