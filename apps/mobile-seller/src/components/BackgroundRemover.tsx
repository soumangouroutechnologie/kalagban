import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface BackgroundRemoverRef {
  removeBackground: (base64OrUri: string) => Promise<string>;
}

interface Props {
  onProcessed?: (resultUri: string) => void;
  onError?: (err: string) => void;
}

const HTML_WORKER = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:transparent;">
  <script>
    function log(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', msg: msg }));
    }

    function processImage(imageData) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function() {
          try {
            // Cap dimensions for mobile performance (max 1000px)
            let w = img.width;
            let h = img.height;
            const maxDim = 1000;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;

            // 1. Detect background color by sampling outer edges
            let totalR = 0, totalG = 0, totalB = 0, count = 0;
            const step = Math.max(1, Math.floor(w / 40));

            // Top & Bottom rows
            for (let x = 0; x < w; x += step) {
              const topIdx = (x) * 4;
              const botIdx = ((h - 1) * w + x) * 4;
              totalR += d[topIdx] + d[botIdx];
              totalG += d[topIdx + 1] + d[botIdx + 1];
              totalB += d[topIdx + 2] + d[botIdx + 2];
              count += 2;
            }

            // Left & Right cols
            for (let y = 0; y < h; y += step) {
              const leftIdx = (y * w) * 4;
              const rightIdx = (y * w + (w - 1)) * 4;
              totalR += d[leftIdx] + d[rightIdx];
              totalG += d[leftIdx + 1] + d[rightIdx + 1];
              totalB += d[leftIdx + 2] + d[rightIdx + 2];
              count += 2;
            }

            const bgR = Math.round(totalR / count);
            const bgG = Math.round(totalG / count);
            const bgB = Math.round(totalB / count);

            // 2. BFS Flood Fill from all 4 borders to remove exterior background
            const visited = new Uint8Array(w * h);
            const queue = [];

            // Add border pixels to queue
            for (let x = 0; x < w; x++) {
              queue.push(x, 0);
              queue.push(x, h - 1);
              visited[x] = 1;
              visited[(h - 1) * w + x] = 1;
            }
            for (let y = 0; y < h; y++) {
              queue.push(0, y);
              queue.push(w - 1, y);
              visited[y * w] = 1;
              visited[y * w + (w - 1)] = 1;
            }

            const tolerance = 48;
            const feather = 24;
            let head = 0;

            while (head < queue.length) {
              const x = queue[head++];
              const y = queue[head++];
              const idx = (y * w + x) * 4;

              const r = d[idx];
              const g = d[idx + 1];
              const b = d[idx + 2];

              // Color distance to sampled background
              const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);

              if (dist < tolerance) {
                d[idx + 3] = 0; // Transparent

                // Check 4 neighbors
                const neighbors = [
                  [x + 1, y],
                  [x - 1, y],
                  [x, y + 1],
                  [x, y - 1]
                ];

                for (let i = 0; i < 4; i++) {
                  const nx = neighbors[i][0];
                  const ny = neighbors[i][1];
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nPos = ny * w + nx;
                    if (!visited[nPos]) {
                      visited[nPos] = 1;
                      queue.push(nx, ny);
                    }
                  }
                }
              } else if (dist < tolerance + feather) {
                // Soft alpha boundary
                const alphaFactor = (dist - tolerance) / feather;
                d[idx + 3] = Math.round(d[idx + 3] * alphaFactor);
              }
            }

            ctx.putImageData(imgData, 0, 0);
            const resultPng = canvas.toDataURL('image/png', 0.92);

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SUCCESS',
              data: resultPng
            }));
          } catch (innerErr) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ERROR',
              message: innerErr.message || 'Erreur traitement canvas'
            }));
          }
        };

        img.onerror = function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: 'Impossible de charger image source'
          }));
        };

        img.src = imageData;
      } catch (outerErr) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ERROR',
          message: outerErr.message || 'Erreur globale'
        }));
      }
    }

    function handleIncomingMessage(event) {
      try {
        const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        const parsed = JSON.parse(raw);
        if (parsed.action === 'removeBg' && parsed.imageData) {
          processImage(parsed.imageData);
        }
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ERROR',
          message: 'Erreur parsing: ' + err.message
        }));
      }
    }

    window.addEventListener('message', handleIncomingMessage);
    document.addEventListener('message', handleIncomingMessage);
  </script>
</body>
</html>
`;

export const BackgroundRemover = forwardRef<BackgroundRemoverRef, Props>(({ onProcessed, onError }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const resolverRef = useRef<((val: string) => void) | null>(null);
  const rejecterRef = useRef<((err: any) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    removeBackground: (imageData: string) => {
      return new Promise<string>((resolve, reject) => {
        resolverRef.current = resolve;
        rejecterRef.current = reject;

        const payload = JSON.stringify({
          action: 'removeBg',
          imageData,
        });

        // Send via injectJavaScript to guarantee execution on all Android WebViews
        const script = `
          if (window.handleIncomingMessage) {
            window.handleIncomingMessage({ data: ${JSON.stringify(payload)} });
          } else {
            window.processImage(${JSON.stringify(imageData)});
          }
          true;
        `;

        webViewRef.current?.injectJavaScript(script);
      });
    },
  }));

  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'SUCCESS' && parsed.data) {
        if (resolverRef.current) {
          resolverRef.current(parsed.data);
          resolverRef.current = null;
        }
        if (onProcessed) onProcessed(parsed.data);
      } else if (parsed.type === 'ERROR') {
        if (rejecterRef.current) {
          rejecterRef.current(new Error(parsed.message));
          rejecterRef.current = null;
        }
        if (onError) onError(parsed.message);
      }
    } catch (e) {
      if (rejecterRef.current) {
        rejecterRef.current(e);
        rejecterRef.current = null;
      }
    }
  };

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: HTML_WORKER, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        style={styles.webView}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    left: -200,
    top: -200,
  },
  webView: {
    width: 1,
    height: 1,
  },
});
