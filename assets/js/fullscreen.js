(function () {
        'use strict';
        var el = document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        var exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        
        var prompt = document.getElementById('fullscreenPrompt');
        var btnAllow = document.getElementById('btnAllowFullscreen');
        var btnSkip = document.getElementById('btnSkipFullscreen');
        var btnFloat = document.getElementById('btnFloatFullscreen');

        // Se il browser non supporta l'API, nascondi tutto
        if (!req) {
          prompt.style.display = 'none';
          return;
        }

        function isFullscreen() {
          return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        }

        function hidePrompt() {
          prompt.style.opacity = '0';
          setTimeout(function() { prompt.style.display = 'none'; }, 300);
        }

        function showPrompt() {
          prompt.style.display = 'flex';
          // Forza reflow
          void prompt.offsetWidth;
          prompt.style.opacity = '1';
        }

        function toggleFloatBtn() {
          if (isFullscreen()) {
            btnFloat.classList.add('opacity-0', 'pointer-events-none');
            btnFloat.classList.remove('opacity-100', 'pointer-events-auto');
          } else {
            btnFloat.classList.remove('opacity-0', 'pointer-events-none');
            btnFloat.classList.add('opacity-100', 'pointer-events-auto');
          }
        }

        function goFullscreen() {
          var promise = req.call(el, { navigationUI: 'hide' });
          if (promise && promise.then) {
            promise.then(function () {
              if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(function () {});
              }
              hidePrompt();
            }).catch(function () {
              // Se fallisce (es. iOS), chiudi il popup per non bloccare
              hidePrompt();
              btnFloat.classList.remove('opacity-0', 'pointer-events-none');
              btnFloat.classList.add('opacity-100', 'pointer-events-auto');
            });
          } else {
            hidePrompt();
          }
        }

        btnAllow.addEventListener('click', goFullscreen);
        
        btnSkip.addEventListener('click', function () {
          hidePrompt();
          btnFloat.classList.remove('opacity-0', 'pointer-events-none');
          btnFloat.classList.add('opacity-100', 'pointer-events-auto');
        });

        btnFloat.addEventListener('click', goFullscreen);

        // Ascolta i cambiamenti di stato (es. se l'utente esce dal fullscreen)
        document.addEventListener('fullscreenchange', toggleFloatBtn);
        document.addEventListener('webkitfullscreenchange', toggleFloatBtn);
        document.addEventListener('mozfullscreenchange', toggleFloatBtn);
        document.addEventListener('MSFullscreenChange', toggleFloatBtn);

        // Se è già in fullscreen al caricamento (es. refresh), nascondi il popup
        if (isFullscreen()) {
          hidePrompt();
        }
      })();
