@echo off
del /f ".git\index.lock" 2>nul && echo Lock cleared || echo No lock found
