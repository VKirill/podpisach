(function () {
  'use strict';

  // Auto-detect config from <script src="https://server.com/t.js?id=123">
  var scripts = document.getElementsByTagName('script');
  var me = scripts[scripts.length - 1];
  var src = me.getAttribute('src') || '';
  var srcUrl;
  try { srcUrl = new URL(src, location.origin); } catch (e) { return; }

  var API = srcUrl.origin;
  var CHANNEL = srcUrl.searchParams.get('id') || '';

  if (!CHANNEL) {
    console.warn('[PS] Missing ?id= parameter');
    return;
  }

  // Дедупликация: не трекать тот же сеанс дважды
  var KEY = '__ps_' + CHANNEL;
  try { if (sessionStorage.getItem(KEY)) return; } catch (e) { /* private mode */ }

  var params = new URLSearchParams(location.search);

  // Простой fingerprint
  var fp = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  var payload = {
    channelId: parseInt(CHANNEL, 10),
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmContent: params.get('utm_content') || undefined,
    utmTerm: params.get('utm_term') || undefined,
    yclid: params.get('yclid') || undefined,
    gclid: params.get('gclid') || undefined,
    referrer: document.referrer || undefined,
    url: location.href,
    fingerprint: fp,
  };

  Object.keys(payload).forEach(function (k) {
    if (payload[k] === undefined) delete payload[k];
  });

  fetch(API + '/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (res) {
      try { sessionStorage.setItem(KEY, res.sessionId || '1'); } catch (e) {}

      // Поддержка обоих атрибутов: data-ps-subscribe (новый) и data-op-subscribe (legacy)
      var btn = document.querySelector('[data-ps-subscribe]') || document.querySelector('[data-op-subscribe]');

      if (btn && res.invite_url) {
        btn.href = res.invite_url;
      }

      if (window.ym && res.ym_counter_id) {
        window.ym(res.ym_counter_id, 'reachGoal', 'ps_visit');
      }

      if (btn && res.ym_counter_id) {
        btn.addEventListener('click', function () {
          if (window.ym) {
            window.ym(res.ym_counter_id, 'reachGoal', 'ps_click');
          }
        });
      }
    })
    .catch(function () {});
})();
