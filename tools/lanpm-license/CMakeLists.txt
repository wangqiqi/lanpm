cmake_minimum_required(VERSION 3.16)
project(lanpm-license VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenSSL REQUIRED)

add_executable(lanpm-license
  src/main.cpp
  src/license_ops.cpp
)

target_include_directories(lanpm-license PRIVATE include)
target_link_libraries(lanpm-license PRIVATE OpenSSL::SSL OpenSSL::Crypto)

install(TARGETS lanpm-license RUNTIME DESTINATION bin)
