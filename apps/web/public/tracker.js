(function () {
  'use strict';

  var API = window.__OP_API || '';
  var CHANNEL = window.__OP_CHANNEL || '';

  if (!API || !CHANNEL) {
    console.warn('[OP] Missing __OP_API or __OP_CHANNEL config');
    return;
  }

  // Дедупликация: не трекать тот же сеанс дважды
  var STORAGE_KEY = '__op_tracked_' + CHANNEL;
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  var params = new URLSearchParams(location.search);

  // Простой fingerprint без внешних зависимостей
  var fp = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  // UTM из URL → camelCase (схема ожидает utmSource, не utm_source)
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

  // Убрать undefined-поля перед отправкой
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
      // Сохраняем sessionId для дедупликации
      sessionStorage.setItem(STORAGE_KEY, res.sessionId || '1');

      var btn = document.querySelector('[data-op-subscribe]');

      // Подставить invite_url в кнопку подписки
      if (btn && res.invite_url) {
        btn.href = res.invite_url;
      }

      // Отправить цель op_visit в Яндекс Метрику
      if (window.ym && res.ym_counter_id) {
        window.ym(res.ym_counter_id, 'reachGoal', 'op_visit');
      }

      // Обработчик клика по кнопке подписки
      if (btn && res.ym_counter_id) {
        btn.addEventListener('click', function () {
          if (window.ym) {
            window.ym(res.ym_counter_id, 'reachGoal', 'op_click');
          }
        });
      }
    })
    .catch(function (err) {
      console.warn('[OP] Track error:', err);
    });
})();
