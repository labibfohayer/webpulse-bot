const https = require('https');
const fs = require('fs');

function uploadVideoDirect(pageId, accessToken, videoPath, description) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(videoPath)) {
        return resolve({ success: false, error: 'file_not_found', message: 'Video file does not exist on disk.' });
      }

      const fileBuffer = fs.readFileSync(videoPath);
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const CRLF = '\r\n';

      let bodyHeader = '--' + boundary + CRLF + 'Content-Disposition: form-data; name="access_token"' + CRLF + CRLF + accessToken + CRLF;
      if (description) {
        bodyHeader += '--' + boundary + CRLF + 'Content-Disposition: form-data; name="description"' + CRLF + CRLF + description + CRLF;
      }
      bodyHeader += '--' + boundary + CRLF + 'Content-Disposition: form-data; name="source"; filename="video.mp4"' + CRLF + 'Content-Type: video/mp4' + CRLF + CRLF;

      const bodyFooter = CRLF + '--' + boundary + '--' + CRLF;
      const totalLen = Buffer.byteLength(bodyHeader) + fileBuffer.length + Buffer.byteLength(bodyFooter);

      const req = https.request({
        hostname: 'graph-video.facebook.com',
        path: `/v19.0/${pageId}/videos`,
        method: 'POST',
        timeout: 45000,
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': totalLen
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(d);
            if (json.id) {
              resolve({
                success: true,
                postId: json.id,
                postUrl: `https://facebook.com/${json.id}`
              });
            } else if (json.error) {
              const errMsg = json.error.message || '';
              console.warn('⚠️ [Facebook Direct Video Upload] Error:', errMsg);
              resolve({
                success: false,
                error: json.error.code || 'fb_error',
                message: errMsg,
                requiresPermission: json.error.code === 190 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('granted')
              });
            } else {
              resolve({ success: false, error: 'unknown', message: 'Unknown Facebook response' });
            }
          } catch (e) {
            resolve({ success: false, error: 'parse_error', message: e.message });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'timeout', message: 'Facebook video upload connection timed out.' });
      });

      req.on('error', (err) => {
        console.warn('⚠️ [Facebook Direct Video Upload] Network error:', err.message);
        resolve({ success: false, error: 'network_error', message: err.message });
      });

      req.write(Buffer.from(bodyHeader));
      req.write(fileBuffer);
      req.write(Buffer.from(bodyFooter));
      req.end();
    } catch (err) {
      resolve({ success: false, error: 'exception', message: err.message });
    }
  });
}

async function publishToFacebook(caption, mediaUrl, config, isVideo = false, videoPath = null) {
  const pageId = config.facebook?.pageId;
  const accessToken = config.facebook?.pageAccessToken;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'missing_config',
      message: 'Facebook Page ID or Page Access Token is not configured.'
    };
  }

  // 1. If video and local file exists, attempt ultrafast direct upload to graph-video endpoint
  if (isVideo && videoPath && fs.existsSync(videoPath)) {
    console.log(`🎬 [Facebook Publisher] Attempting direct multipart video upload (${videoPath})...`);
    const directRes = await uploadVideoDirect(pageId, accessToken, videoPath, caption);
    if (directRes.success) {
      return directRes;
    }
    // If auth error, return immediately without useless retry
    if (directRes.requiresPermission || directRes.error === 190) {
      return directRes;
    }
    console.warn('⚠️ Direct video upload failed, falling back to file_url / photo method...');
  }

  // 2. URL-based or feed post request
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
        timeout: 25000,
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

              // Immediate check for Auth / Permission / Expired Token errors
              const isAuthError = json.error.code === 190 || json.error.code === 102 ||
                errMsg.toLowerCase().includes('permission') ||
                errMsg.toLowerCase().includes('access token') ||
                errMsg.toLowerCase().includes('must be granted') ||
                errMsg.toLowerCase().includes('session');

              if (isAuthError) {
                // DO NOT RETRY IF AUTH/TOKEN ERROR! Return immediately to prevent hanging
                resolve({
                  success: false,
                  error: json.error.code || 190,
                  message: errMsg,
                  requiresPermission: true
                });
                return;
              }

              if (mode === 'video' && !isRetry) {
                console.warn('⚠️ [Facebook Video] Video URL fetch issue, falling back to feed post...');
                const feedRes = await sendRequest(null, 'feed', true);
                resolve(feedRes);
                return;
              }

              const isImageErr = json.error.code === 324 || errMsg.toLowerCase().includes('image') || errMsg.toLowerCase().includes('file');
              if (mode === 'photo' && isImageErr && !isRetry) {
                console.warn('⚠️ [Facebook Photo] Photo URL rejected, falling back to feed post...');
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

      req.on('timeout', async () => {
        req.destroy();
        console.warn(`⚠️ [Facebook Publish ${mode}] Request timed out.`);
        if (!isRetry) {
          const feedRes = await sendRequest(null, 'feed', true);
          resolve(feedRes);
        } else {
          resolve({ success: false, error: 'timeout', message: 'Facebook request timed out.' });
        }
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
