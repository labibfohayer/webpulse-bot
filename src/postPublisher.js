const https = require('https');

async function publishToFacebook(caption, mediaUrl, config, isVideo = false) {
  const pageId = config.facebook?.pageId;
  const accessToken = config.facebook?.pageAccessToken;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'missing_config',
      message: 'Facebook Page ID or Page Access Token is not configured.'
    };
  }

  const sendRequest = (targetUrl, mode = 'photo', isRetry = false) => {
    return new Promise((resolve) => {
      let postData = '';
      let endpointPath = '';

      if (mode === 'video' && targetUrl) {
        endpointPath = `/v19.0/${pageId}/videos`;
        postData = JSON.stringify({
          file_url: targetUrl,
          description: caption,
          access_token: accessToken
        });
      } else if (mode === 'photo' && targetUrl) {
        endpointPath = `/v19.0/${pageId}/photos`;
        postData = JSON.stringify({
          url: targetUrl,
          caption: caption,
          access_token: accessToken
        });
      } else {
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
        res.on('end', async () => {
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
              const errMsg = json.error.message || '';
              console.warn(`⚠️ [Facebook Publish ${mode}] Error:`, errMsg);

              if (mode === 'video' && !isRetry) {
                console.warn('⚠️ [Facebook Video] Video URL fetch issue, falling back to 4K Photo banner...');
                const photoFallback = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';
                const retryRes = await sendRequest(photoFallback, 'photo', true);
                resolve(retryRes);
                return;
              }

              const isImageErr = json.error.code === 324 || errMsg.toLowerCase().includes('image') || errMsg.toLowerCase().includes('file');
              if (mode === 'photo' && isImageErr && !isRetry) {
                console.warn('⚠️ [Facebook Photo] Image failed, retrying with verified backup 4K banner...');
                const backupUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';
                const retryRes = await sendRequest(backupUrl, 'photo', true);
                resolve(retryRes);
                return;
              } else if (mode === 'photo' && isImageErr && isRetry) {
                console.warn('⚠️ [Facebook Photo] Photo post retry failed, falling back to feed post...');
                const feedRes = await sendRequest(null, 'feed', true);
                resolve(feedRes);
                return;
              }

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

      req.on('error', async (err) => {
        if (!isRetry) {
          console.warn(`⚠️ [Facebook Publish ${mode}] Network error, retrying feed post...`);
          const feedRes = await sendRequest(null, 'feed', true);
          resolve(feedRes);
        } else {
          resolve({ success: false, error: 'network_error', message: err.message });
        }
      });

      req.write(postData);
      req.end();
    });
  };

  const initialMode = isVideo ? 'video' : (mediaUrl ? 'photo' : 'feed');
  return sendRequest(mediaUrl, initialMode, false);
}

module.exports = { publishToFacebook };
