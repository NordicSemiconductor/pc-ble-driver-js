cmake_minimum_required(VERSION 2.8)

# Name of the project (will be the name of the plugin)
project (ble_driver_js)

# TODO: add support for
if("$ENV{PC_BLE_DRIVER_DIR}" STREQUAL "")
    message(WARNING "Environment variable PC_BLE_DRIVER_DIR not set. The environment variable can point at a custom pc-ble-driver.")
    set(_PC_BLE_DRIVER_DIR ${CMAKE_CURRENT_SOURCE_DIR})
else()
    message("AddOn build uses build directory $ENV{PC_BLE_DRIVER_DIR}.")
    file(TO_CMAKE_PATH $ENV{PC_BLE_DRIVER_DIR} _PC_BLE_DRIVER_DIR)
endif()

set(BLE_DRIVER_INCLUDE_DIR ${_PC_BLE_DRIVER_DIR}/driver/include)
set(BLE_DRIVER_LIBRARY_DIR ${_PC_BLE_DRIVER_DIR}/driver/lib)

message("Searching for pc-ble-driver library in ${BLE_DRIVER_LIBRARY_DIR}")

# Essential include files to build a node addon,
# you should add this line in every CMake.js based project.
include_directories(${CMAKE_JS_INC} ${BLE_DRIVER_INCLUDE_DIR})

# Declare the source files location
file(GLOB SOURCE_FILES "src/*.cpp" "src/*.h")

# This line will tell CMake that we're building a shared library
# from the above source files
# named after the project's name
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# This line will give our library file a .node extension without any "lib" prefix
# set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
set_target_properties(${PROJECT_NAME}
    PROPERTIES
    COMPILE_FLAGS "${CMAKE_CXX_FLAGS} -DBUILDING_NODE_EXTENSION"
    PREFIX ""
    SUFFIX ".node")


if(WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")
endif(WIN32)

# Find BLE driver library
find_library(BLE_DRIVER_LIBRARY s130_nrf51_ble_driver HINTS ${BLE_DRIVER_LIBRARY_DIR})

# Essential library files to link to a node addon,
# you should add this line in every CMake.js based project.
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} ${BLE_DRIVER_LIBRARY})
