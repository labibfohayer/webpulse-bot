const https = require('https');

async function publishToFacebook(caption, imageUrl, config) {
  const pageId = config.facebook?.pageId;
  const accessToken = config.facebook?.pageAccessToken;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'missing_config',
      message: 'Facebook Page ID or Page Access Token is not configured.'
    };
  }

  return new Promise((resolve) => {
    let postData = '';
    let endpointPath = '';

    if (imageUrl) {
      // Publish as Photo post with caption
      endpointPath = `/v19.0/${pageId}/photos`;
      postData = JSON.stringify({
        url: imageUrl,
        caption: caption,
        access_token: accessToken
      });
    } else {
      // Publish as text feed post
      endpointPath = `/v19.0/${pageId}/feed`;
      postData = JSON.stringify({
        message: caption,
        access_token: accessToken
      });
    }

    const options = {
      hostname: 'graph.facebook.com',
      path: endpointPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.id || json.post_id) {
            const id = json.post_id || json.id;
            resolve({
              success: true,
              postId: id,
              postUrl: `https://facebook.com/${id}`
            });
          } else if (json.error) {
            resolve({
              success: false,
              error: json.error.code || 'fb_error',
              message: json.error.message,
              requiresPermission: json.error.message?.includes('pages_manage_posts') || json.error.message?.includes('pages_read_engagement')
            });
          } else {
            resolve({ success: false, error: 'unknown', message: 'Unknown response from Facebook.' });
          }
        } catch (e) {
          resolve({ success: false, error: 'parse_error', message: e.message });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: 'network_error', message: err.message });
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { publishToFacebook };
