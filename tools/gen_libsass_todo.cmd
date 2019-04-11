@echo off

SETLOCAL

SET EXEC=%~0
SET ISSUE=%1

REM split exec into parts
For %%F IN ("%EXEC%") do (
	Set FOLDER=%%~dpF
	Set NAME=%%~nxF
)

REM test if we have an issue nr
if [%1] == [] GOTO :NoIssue
SET SPECS=%FOLDER%..\spec

if not exist "%ISSUE%.scss" (
	echo input source not found: %ISSUE%.scss
	goto :End
)

SET GITCMD=git -C "%FOLDER%.."

%GITCMD% fetch --all
%GITCMD% checkout -f -B todo/issue_%ISSUE% master

if exist "%SPECS%\libsass-closed-issues\issue_%ISSUE%" GOTO :IsClosed
if exist "%SPECS%\libsass-closed-issues\issue_%ISSUE%.hrx" GOTO :IsClosed

if not exist "%SPECS%\libsass-todo-issues\issue_%ISSUE%" (
	mkdir "%SPECS%\libsass-todo-issues\issue_%ISSUE%"
)

set ROOT=%SPECS%\libsass-todo-issues\issue_%ISSUE%

copy %ISSUE%.scss %ROOT%\input.scss

sass %ROOT%\input.scss %ROOT%\output.css ^
	--no-source-map

if exist "%ROOT%.hrx" del %ROOT%.hrx
echo ^<===^> input.scss >> %ROOT%.hrx
type %ROOT%\input.scss >> %ROOT%.hrx
echo ^<===^> output.css >> %ROOT%.hrx
type %ROOT%\output.css >> %ROOT%.hrx

del %ROOT%\input.scss
del %ROOT%\output.css

dos2unix %ROOT%.hrx
%GITCMD% add %ROOT%.hrx
%GITCMD% commit -m "Add todo spec test for libsass issue %ISSUE%" ^
	-m "" -m "https://github.com/sass/libsass/issues/%ISSUE%"

echo You may push the branch to your remote repository now
if [%2] == [] GOTO :End
echo Going to push to remote %2
%GITCMD% push %2 todo/issue_%ISSUE%

GOTO :End

:IsClosed

echo Issue seems to be closed already

:NoIssue

echo Please pass an issue number

GOTO :End

:End
