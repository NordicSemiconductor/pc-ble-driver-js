cmake_minimum_required(VERSION 2.8.12)

# Name of the project (will be the name of the plugin)
project (pc-ble-driver-js)

# All projects depending on pc-ble-driver need to include this first
include(pc-ble-driver/cmake/pc-ble-driver.cmake)
add_subdirectory(pc-ble-driver)

set(UECC_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/uECC)
# Essential include files to build a node addon,
# you should add this line in every CMake.js based project.
include_directories(${CMAKE_JS_INC} ${PC_BLE_DRIVER_INCLUDE_DIR} ${UECC_INCLUDE_DIR})

# Specify source files
file (GLOB SOURCE_FILES
    "src/adapter.cpp"
    "src/serialadapter.cpp"
    "src/common.cpp"
    "src/driver.cpp"
    "src/driver_gap.cpp"
    "src/driver_gatt.cpp"
    "src/driver_gattc.cpp"
    "src/driver_gatts.cpp"
    "src/driver_uecc.cpp"
    "src/*.h"
)

file (GLOB UECC_SOURCE_FILES
    "src/uECC/*.c"
)

if(WIN32)
elseif(APPLE)
else()
    # Assume Linux
endif()

# Force .c files to be compiled with the C++ compiler
set_source_files_properties(
    ${UECC_SOURCE_FILES}
    PROPERTIES
    LANGUAGE CXX
)

# This line will tell CMake that we're building a shared library
# named after the project's name
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${UECC_SOURCE_FILES} ${PLATFORM_SOURCE_FILES})

# This line will give our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME}
    PROPERTIES
    COMPILE_FLAGS "${CMAKE_CXX_FLAGS} -DBUILDING_NODE_EXTENSION"
    PREFIX ""
    SUFFIX ".node")

# Build the pc-ble-driver as a static library
add_definitions(
    -DPC_BLE_DRIVER_STATIC
)

if(WIN32)
    include_directories("${CMAKE_JS_INC}/win")
    set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")
elseif(APPLE)
    target_link_libraries(${PROJECT_NAME} "-framework CoreFoundation")
    target_link_libraries(${PROJECT_NAME} "-framework IOKit")
    set_property(TARGET ${PROJECT_NAME} PROPERTY MACOSX_RPATH ON)
else()
    # Assume Linux
    target_link_libraries(${PROJECT_NAME} "udev")
endif()

# Essential library files to link to a node addon,
# you should add this line in every CMake.js based project.
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} ${PC_BLE_DRIVER_STATIC_LIB})
