# pc-ble-driver-js

`pc-ble-driver-js` provides a Node.js interface to the C/C++ [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library. 

## Overview

`pc-ble-driver` allows an nRF5 connectivity chip running Nordic's SoftDevice to be controlled via serial port ([BLE Serialization](https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.sdk5.v12.0.0%2Flib_serialization.html)) by an application - enabling the application with complete BLE functionality. `pc-ble-driver-js` is higher-level than `pc-ble-driver` and leans towards convention over configuration. Getting started is quick and easy. This module may be useful for tasks ranging from automated BLE testing to [desktop applications](https://www.nordicsemi.com/eng/Products/Bluetooth-low-energy/nRF-Connect-for-desktop) and BLE gateways in production.

## Installing

To run `pc-ble-driver-js` you will first need to set up your nRF5 connectivity chip. You can find additional information here: [Hardware Setup](https://github.com/NordicSemiconductor/pc-ble-driver#hardware-setup).

Before installing `pc-ble-driver-js` you will need to have [Boost](http://www.boost.org/) installed. To install and compile Boost, please follow the instructions here: [Building Boost](https://github.com/NordicSemiconductor/pc-ble-driver#building-boost). Make sure you have built the Boost libraries for the architecture (32 or 64-bit) required by your Node installation.

### Submodule

This repository refers to the [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library as a submodule. To ensure the submodule is downloaded when cloning `pc-ble-driver-js`, use:

    git clone --recursive <repository-url>

Or if you have already cloned the repository:

    git submodule update --init --recursive

### Dependencies

In addition to the dependencies and steps described above, the following is required:
* Node.js (>=4.4.7)
* npm (>=3.7.0)

### Platform specific notes

#### Windows

Configure cmake-js:

    npm config set cmake_CMAKE_GENERATOR:INTERNAL="Visual Studio 14 2015"
    npm config set cmake_BOOST_ROOT=c:\path\to\boost_x_xx_x

#### Ubuntu Linux and OS X/macOS

Configure cmake-js:

    npm config set cmake_BOOST_ROOT=/path/to/boost_x_xx_x

### Installation

Now you are ready to build and install `pc-ble-driver-js` by running:

    npm install pc-ble-driver-js

## Unit tests

To run unit tests:

    npm test

## Examples/system tests

Examples/system tests require one or more development kits to be connected to your computer. These tests can be found in the `test` directory, and have to be run manually. F.ex. to test scanning, run:

    node test/simpleScanTest.js

## Contributing

We are currently working on a Contributor License Agreement (CLA), which will allow third party contributions to this project. We do not accept pull requests for the time being, but feel free to file code related issues on [GitHub Issues](https://github.com/NordicSemiconductor/pc-ble-driver-js/issues).

## License

See the [license file](LICENSE) for details.
