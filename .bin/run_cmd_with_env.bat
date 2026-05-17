@echo off
set thisPath=%~dp0
set thisFileName=%~nx0
set appTitleName=%thisFileName%

if "%1"=="" (
	:: run this file with title "%appTitleName%" for set position and size from registry
	cmd /c start "%appTitleName%" /D "%thisPath%" /I %thisFileName% "not_exit"
	exit
)

call "%thisPath%\set_env.bat"

cls
chcp 65001

cmd
