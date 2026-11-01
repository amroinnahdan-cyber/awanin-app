import { useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type AirMapPoint = {
  slug: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  /** Displayed index (already in the user's chosen scale) */
  value: number;
  /** Category colour for the circle fill */
  color: string;
  /** Value-label ink readable on that category colour (readableOn) */
  labelColor?: string;
  /** Unit label, e.g. "ISPU" or "AQI" */
  unit: string;
};

type AirMapViewProps = {
  points: AirMapPoint[];
  onSelect: (slug: string) => void;
};

const SELECT_MESSAGE = 'awanin-select';

/**
 * Free interactive air-quality map: OpenStreetMap tiles rendered by Leaflet,
 * no API key anywhere.
 *
 * One HTML document serves both transports: a `WebView` on native and an
 * `<iframe>` with `srcDoc` on web (react-native-webview does not render on
 * web). Markers arrive pre-coloured by category, so the page itself stays
 * markup only — consumers own every scale decision.
 *
 * Tiles come from `tile.openstreetmap.org` under their free usage policy; the
 * required attribution stays on the map exactly as the policy asks.
 */
export function AirMapView({ points, onSelect }: AirMapViewProps) {
  const handleMessage = useCallback(
    (data: string) => {
      try {
        const parsed = JSON.parse(data) as { type?: string; slug?: string };
        if (parsed?.type === SELECT_MESSAGE && typeof parsed.slug === 'string') {
          onSelect(parsed.slug);
        }
      } catch {
        // Non-JSON message: ignore, the page only ever sends our own shape.
      }
    },
    [onSelect],
  );

  // On web the iframe reports selections through `window.postMessage`; on
  // native the WebView calls `onMessage`. The page sends to both channels, so
  // one HTML document works everywhere.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      handleMessage(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handleMessage]);

  const html = useMemo(() => buildLeafletHtml(points), [points]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        <iframe
          srcDoc={html}
          title="Peta kualitas udara Indonesia"
          style={WEB_FRAME_STYLE}
          sandbox="allow-scripts allow-same-origin"
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <WebView
        source={{ html }}
        style={styles.fill}
        originWhitelist={['*']}
        onMessage={(event: WebViewMessageEvent) => handleMessage(event.nativeEvent.data)}
        containerStyle={styles.fill}
        scrollEnabled={false}
      />
    </View>
  );
}

/** iframe must be explicitly non-shrinking: its default height is 150px. */
const WEB_FRAME_STYLE: CSSProperties = {
  flex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
};

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#dfe6ec' },
});

function buildLeafletHtml(points: AirMapPoint[]): string {
  // JSON rides inside a <script>; escape "</" so a city/province containing
  // "</script>" cannot break out of the page. (Cities don't — defence anyway.)
  const payload = JSON.stringify(points).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #dfe6ec; }
  #map { width: 100%; height: 100%; }
  .awanin-value {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    color: #153c70;
    font: 600 11px/13px -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  }
  .awanin-value::before { display: none; }
  .leaflet-popup-content { font-family: system-ui, sans-serif; font-size: 12px; }
  .leaflet-popup-content b { display: block; font-size: 13px; margin-bottom: 2px; }
  .leaflet-popup-content .area { color: #6b7a90; }
  .leaflet-container .leaflet-control-attribution {
    /* 8px: at 9px the control ran a character past the slot edge on a
       ~972-css-px Android WebView slot. The right margin keeps glyphs clear
       of the map slot's rounded corner clip. */
    font-size: 8px;
    margin-right: 10px;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script>
  window.__points = ${payload};
  (function () {
    var send = function (slug) {
      var message = JSON.stringify({ type: '${SELECT_MESSAGE}', slug: slug });
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(message);
      }
    };

    function start() {
      if (typeof window.L === 'undefined') { setTimeout(start, 120); return; }
      var map = L.map('map', { attributionControl: true, zoomControl: true });
      // Kept short: on a narrow WebView slot the control is one line and must
      // not clip past the map edge. The full "kontributor OpenStreetMap"
      // attribution lives on the app screen right below the map.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 7,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      var bounds = [];
      window.__points.forEach(function (point) {
        var marker = L.circleMarker([point.latitude, point.longitude], {
          radius: 15,
          color: point.color,
          weight: 2,
          fillColor: point.color,
          fillOpacity: 0.85,
        });
        // Permanent tooltip renders as an overlay div — safe for SVG, unlike
        // stamping text into the marker's own <path> element.
        marker.bindTooltip(String(point.value), {
          permanent: true,
          direction: 'center',
          className: 'awanin-value',
        });
        // Dark categories (maroon, deep purple) drown navy ink. getTooltip()
        // is a Leaflet layer, its _container is the real DOM node — guard
        // both, since a crash inside this loop leaves the whole map blank.
        const tip = marker.getTooltip();
        if (point.labelColor && tip && tip._container) {
          tip._container.style.color = point.labelColor;
        }
        marker.bindPopup(
          '<b>' + point.name + '</b>' +
          '<span class="area">' + point.province + '</span><br>' +
          point.unit + ' ' + point.value
        );
        marker.on('click', function () { send(point.slug); });
        marker.addTo(map);
        bounds.push([point.latitude, point.longitude]);
      });

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 6 });
      } else {
        map.setView([-2.5, 118], 5);
      }
    }
    start();
  })();
<\/script>
</body>
</html>`;
}
