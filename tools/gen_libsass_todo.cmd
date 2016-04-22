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

if not exist "%SPECS%\libsass-todo-issues\issue_%ISSUE%" (
  mkdir "%SPECS%\libsass-todo-issues\issue_%ISSUE%"
)

copy %ISSUE%.scss %SPECS%\libsass-todo-issues\issue_%ISSUE%\input.scss
REM not sure why this is needed, but sass-spec did not create it otherwise
copy %ISSUE%.scss %SPECS%\libsass-todo-issues\issue_%ISSUE%\expected_output.css

ruby %SPECS%\..\sass-spec.rb -g --run-todo --root "%SPECS%\libsass-todo-issues\issue_%ISSUE%"

%GITCMD% add %SPECS%\libsass-todo-issues\issue_%ISSUE%\*
%GITCMD% commit -m "Activate libsass todo test for issue %ISSUE%" ^
	-m "" -m "https://github.com/sass/libsass/issues/%ISSUE%"

echo You may push the branch to your reote repository now
if [%2] == [] GOTO :End
echo Going to push to remote %2
%GITCMD% push %2 todo/issue_%ISSUE% master

GOTO :End

:NoIssue

echo Please pass an issue number

GOTO :End

:End
