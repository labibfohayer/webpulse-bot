const https = require('https');

const token = '8746325618:AAHLKzCLFHCEbSU9KzehZC3o4gcGeusXmvU';

https.get(`https://api.telegram.org/bot${token}/getMe`, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Telegram Bot Info:', data);
  });
}).on('error', err => {
  console.error('Error connecting to Telegram:', err.message);
});
