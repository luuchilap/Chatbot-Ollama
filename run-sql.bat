@echo off
set PGPASSWORD=lap20040106
echo Executing SQL script on chatbot_ollama database...
psql -U postgres -d chatbot_ollama -f database-schema.sql
echo SQL execution completed.
pause 