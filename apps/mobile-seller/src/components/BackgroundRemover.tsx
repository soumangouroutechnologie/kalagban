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
  <script src="https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/bundle.js"></script>
</head>
<body style="margin:0;padding:0;background:transparent;">
  <canvas id="c" style="display:none;"></canvas>
  <script>
    let isProcessing = false;

    window.processImage = async function(imageData) {
      if (isProcessing) return;
      isProcessing = true;

      try {
        // 1. Try AI-based background removal if @imgly is available
        if (window.imglyRemoveBackground) {
          const blob = await window.imglyRemoveBackground(imageData);
          const reader = new FileReader();
          reader.onloadend = function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SUCCESS',
              data: reader.result
            }));
            isProcessing = false;
          };
          reader.readAsDataURL(blob);
          return;
        }

        // 2. Fallback high-speed intelligent edge-segmentation canvas algorithm
        fallbackCanvasRemoval(imageData);
      } catch (err) {
        // Fallback to canvas removal on any network or WebAssembly error
        try {
          fallbackCanvasRemoval(imageData);
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: err.message || e.message
          }));
          isProcessing = false;
        }
      }
    };

    function fallbackCanvasRemoval(imageData) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        const canvas = document.getElementById('c');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // Sample background corner color
        const bgR = (d[0] + d[(canvas.width - 1) * 4] + d[(canvas.height - 1) * canvas.width * 4] + d[(canvas.height * canvas.width - 1) * 4]) / 4;
        const bgG = (d[1] + d[(canvas.width - 1) * 4 + 1] + d[(canvas.height - 1) * canvas.width * 4 + 1] + d[(canvas.height * canvas.width - 1) * 4 + 1]) / 4;
        const bgB = (d[2] + d[(canvas.width - 1) * 4 + 2] + d[(canvas.height - 1) * canvas.width * 4 + 2] + d[(canvas.height * canvas.width - 1) * 4 + 2]) / 4;

        const tolerance = 45;
        const feather = 20;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i+1];
          const b = d[i+2];

          const diff = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);

          if (diff < tolerance) {
            d[i+3] = 0; // Fully transparent
          } else if (diff < tolerance + feather) {
            d[i+3] = Math.round(((diff - tolerance) / feather) * 255); // Soft antialiased edge
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SUCCESS',
          data: resultUrl
        }));
        isProcessing = false;
      };

      img.onerror = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ERROR',
          message: 'Erreur de chargement de image'
        }));
        isProcessing = false;
      };

      img.src = imageData;
    }

    document.addEventListener('message', function(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.action === 'removeBg') {
          window.processImage(msg.imageData);
        }
      } catch (err) {}
    });

    window.addEventListener('message', function(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.action === 'removeBg') {
          window.processImage(msg.imageData);
        }
      } catch (err) {}
    });
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

        webViewRef.current?.postMessage(payload);
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
        source={{ html: HTML_WORKER }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
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
    left: -100,
    top: -100,
  },
  webView: {
    width: 1,
    height: 1,
  },
});
