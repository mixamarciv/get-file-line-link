@echo off
set thisPath=%~dp0
set thisDisk=%thisPath:~0,2%
set workPath=%thisPath%\..


echo go to work path "%workPath%"
%thisDisk%
cd "%workPath%"


set NODE_MODULES_BIN=%thisPath%\..\node_modules\.bin
echo add to path: %NODE_MODULES_BIN%
set PATH=%path%;%NODE_MODULES_BIN%


set SEVEN_ZIP_PATH=c:\Program Files\7-Zip;c:\Program Files (x86)\7-Zip
echo add to path: %SEVEN_ZIP_PATH%
set PATH=%path%;%SEVEN_ZIP_PATH%


set CYGWIN64_PATH=C:\cygwin64\bin\;C:\cygwin64\sbin\
echo add to path: %CYGWIN64_PATH%
set PATH=%path%;%CYGWIN64_PATH%


set LUA_PATH=C:\Lua\5.1\
echo add to path: %LUA_PATH%
set PATH=%path%;%LUA_PATH%


set OPENSSL_PATH=C:\program_files\Git\usr\bin\
echo add to path: %OPENSSL_PATH%
set PATH=%path%;%OPENSSL_PATH%
