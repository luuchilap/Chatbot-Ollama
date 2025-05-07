@echo off
set PGPASSWORD=lap20040106
echo Inserting mock data into chatbot_ollama database...
psql -U postgres -d chatbot_ollama -f mock-data.sql
echo Mock data insertion completed.
pause 