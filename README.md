# Introduction
pc-ble-driver-js is a NodeJS AddOn for the pc-ble-driver library.

pc-ble-driver-js depends on the pc-ble-driver repository referrenced as a submodule:
* [pc-ble-driver  library](https://github.com/NordicSemiconductor/pc-ble-driver)
 

The AddOn does not support all of the functions in the [pc-ble-driver  library](https://github.com/NordicSemiconductor/pc-ble-driver).

This is a very early implementation, we are working on making the AddOn production quality.

When production quality is reached we will probably publish it on npmjs. Stay with us!

# Installation procedure

To run the AddOn you will need to set up your boards to be able to communicate with your computer.
You can find additional information here:

[Hardware setup](https://github.com/NordicSemiconductor/pc-ble-driver/tree/self_contained_driver#hardware-setup)

Before building this AddOn you will need to have Boost installed and some of its libraries statically compiled.
To install and compile Boost, please follow the instructions here:

[Building Boost](https://github.com/NordicSemiconductor/pc-ble-driver/tree/self_contained_driver#building-boost)

You need to have the cmake-js npm installed and the correct C++ compiler that matches your version of NodeJS.

Your nRF51 Development Kit needs to be flashed with the connectivity firmware found in  pc-ble-driver/hex/connectivity_115k2_with_s130_1.0.0.hex.

# Platform specific notes

## WIN32

Setup npm:

```
npm config set cmake_CMAKE_GENERATOR:INTERNAL="Visual Studio 12 2013"
npm config set cmake_BOOST_ROOT=c:\users\kere\dev\boost_1_60_0
```

## Ubuntu Linux

Setup npm:

```
npm config set cmake_BOOST_ROOT=/path/to/boost_x_xx_x
```

# Run example

```
node test/simpleScanTest.js
```
