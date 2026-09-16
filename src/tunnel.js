const localtunnel = require('localtunnel');

async function startTunnel(port = 3000) {
  try {
    const tunnel = await localtunnel({ port });
    console.log(`\n======================================================`);
    console.log(`🌐 Public HTTPS Webhook URL: ${tunnel.url}/api/webhook/facebook`);
    console.log(`🔑 Webhook Verify Token: MY_FB_SECRET_VERIFY_TOKEN_123`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });

    return tunnel;
  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
  }
}

if (require.main === module) {
  startTunnel(3000);
}

module.exports = { startTunnel };
