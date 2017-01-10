# pc-ble-driver-js

pc-ble-driver-js is a Node.js AddOn for the [pc-ble-driver  library](https://github.com/NordicSemiconductor/pc-ble-driver). It depends on the pc-ble-driver repository referenced as a submodule.

# Installation procedure

To run the AddOn you will need to set up your boards to be able to communicate with your computer.
You can find additional information here:

[Hardware setup](https://github.com/NordicSemiconductor/pc-ble-driver#hardware-setup)

Before building this AddOn you will need to have Boost installed and some of its libraries statically compiled.
To install and compile Boost, please follow the instructions here:

[Building Boost](https://github.com/NordicSemiconductor/pc-ble-driver#building-boost)

Note: Make sure you have built the Boost libraries for the architecture (32 or 64-bit) required by your Node installation.

## Submodule

This repository refers to the [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library as a submodule. To make sure that the submodule is downloaded when cloning pc-ble-driver-js, use:

    git clone --recursive <repository-url>

Or if you have already cloned the repository:

    git submodule update --init --recursive

## Dependencies

In addition to the dependencies and steps described above, the following is required:
* Node.js (>=4.4.7)
* npm (>=3.7.0)

## Platform specific notes

### Windows

Configure cmake-js:

    npm config set cmake_CMAKE_GENERATOR:INTERNAL="Visual Studio 14 2015"
    npm config set cmake_BOOST_ROOT=c:\path\to\boost_x_xx_x

### Ubuntu Linux and macOS

Configure cmake-js:

    npm config set cmake_BOOST_ROOT=/path/to/boost_x_xx_x

## Installation

When all the above has been set up, you are ready to compile and install by running:

    npm install

# Unit tests

To run unit tests:

    npm test

# Examples/system tests

Examples/system tests require one or more development kits to be connected to your computer. These tests can be found in the `test` directory, and have to be run manually. F.ex. to test scanning, run:

    node test/simpleScanTest.js

# Contributing

We are currently working on a Contributor License Agreement (CLA), which will allow third party contributions to this project. We do not accept pull requests for the time being, but feel free to file code related issues on [GitHub Issues](https://github.com/NordicSemiconductor/pc-ble-driver-js/issues).

# License

See the [license file](LICENSE) for details.
