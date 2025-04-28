// Simple test script to check LMStudio connectivity
const url = 'http://127.0.0.1:1234/v1/models';

console.log('Testing connection to LMStudio at:', url);

fetch(url)
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('LMStudio is running!');
    console.log('Available models:', data.data.map(model => model.id));
    console.log('Full response data:', data);
  })
  .catch(error => {
    console.error('Failed to connect to LMStudio:');
    console.error(error.message);
  }); 