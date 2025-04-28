// Simple test script to check Ollama connectivity
const url = 'http://127.0.0.1:11434/api/version';

console.log('Testing connection to Ollama at:', url);

fetch(url)
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Ollama is running!');
    console.log('Response data:', data);
  })
  .catch(error => {
    console.error('Failed to connect to Ollama:');
    console.error(error.message);
  }); 