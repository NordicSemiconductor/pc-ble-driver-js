# Installation

## Installation from npm

To install pc-ble-driver-js for use in a Node.js project, simply:

    $ npm install pc-ble-driver-js

This will work as long as precompiled binaries exist for your platform/runtime environment, ref. the files attached to the [Releases](https://github.com/NordicSemiconductor/pc-ble-driver-js/releases). If not, then follow the steps below to install from source.

## Installation from source

If precompiled binaries do not exist in your case, or you are going to do development on this project, you will need to install from source.

### Dependencies

The following Node/npm versions are required:

* Node.js (>=4.4.7)
* npm (>=3.7.0)

### Submodule

This repository refers to the [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library as a submodule. To ensure that the submodule is downloaded when cloning pc-ble-driver-js, use:

    $ git clone --recursive <repository-url>

Or if you have already cloned this repository:

    $ git submodule update --init --recursive

### pc-ble-driver

As building pc-ble-driver-js also involves building pc-ble-driver, you first need to follow the [pc-ble-driver installation instructions](https://github.com/NordicSemiconductor/pc-ble-driver/blob/master/Installation.md). Important note: When building the Boost libraries, make sure to build it for the architecture (32 or 64-bit) required by your Node.js installation. Once you have been able to successfully compile pc-ble-driver, you are ready to proceed with the steps below.

### Platform-specific

Some extra npm config is required for cmake-js.

#### Windows

Configure cmake-js:

    $ npm config set cmake_CMAKE_GENERATOR:INTERNAL="Visual Studio 14 2015"
    $ npm config set cmake_BOOST_ROOT=c:\path\to\boost_x_xx_x

#### Ubuntu Linux and macOS

Configure cmake-js:

    $ npm config set cmake_BOOST_ROOT=/path/to/boost_x_xx_x

### Installation

Now you are ready to install pc-ble-driver-js:

    $ npm install

### Unit tests

Run unit tests to verify a successful installation:

    $ npm test
