/* eslint-env browser */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohm, root.ohmEditor, root.cmUtil, root.domUtil);
  }
})(this, function(ohm, ohmEditor, cmUtil, domUtil) {
  var checkboxes;
  var grammarChanged = true;
  var inputChanged = true;

  var showFailuresImplicitly = true;

  var $ = domUtil.$;
  var $$ = domUtil.$$;

  // Helpers
  // -------

  function parseGrammar(source) {
    var matchResult = ohm.ohmGrammar.match(source);
    var grammar;
    var err;

    if (matchResult.succeeded()) {
      var ns = {};
      try {
        ohm._buildGrammar(matchResult, ns);
        var firstProp = Object.keys(ns)[0];
        if (firstProp) {
          grammar = ns[firstProp];
        }
      } catch (ex) {
        err = ex;
      }
    } else {
      err = {
        message: matchResult.message,
        shortMessage: matchResult.shortMessage,
        interval: matchResult.getInterval()
      };
    }
    return {
      matchResult: matchResult,
      grammar: grammar,
      error: err
    };
  }

  function refresh() {
    var grammarEditor = ohmEditor.ui.grammarEditor;
    var inputEditor = ohmEditor.ui.inputEditor;

    var grammarSource = grammarEditor.getValue();
    var inputSource = inputEditor.getValue();

    ohmEditor.saveState(inputEditor, 'input');

    // Refresh the option values.
    for (var i = 0; i < checkboxes.length; ++i) {
      var checkbox = checkboxes[i];
      ohmEditor.options[checkbox.name] = checkbox.checked;
    }

    if (inputChanged || grammarChanged) {
      showFailuresImplicitly = true;  // Reset to default.
    }

    if (inputChanged) {
      inputChanged = false;
      ohmEditor.emit('change:input', inputSource);
    }

    if (grammarChanged) {
      grammarChanged = false;
      ohmEditor.emit('change:grammar', grammarSource);

      var result = parseGrammar(grammarSource);
      ohmEditor.grammar = result.grammar;
      ohmEditor.emit('parse:grammar', result.matchResult, result.grammar, result.error);
    }

    if (ohmEditor.grammar && ohmEditor.grammar.defaultStartRule) {
      var trace = ohmEditor.grammar.trace(inputSource);

      // When the input fails to parse, turn on "show failures" automatically.
      if (trace.result.failed() && showFailuresImplicitly) {
        ohmEditor.options.showFailures = true;
        $('input[name=showFailures]').checked = true;
      }

      ohmEditor.emit('parse:input', trace.result, trace);
    }
  }

  ohmEditor.restoreState = function(editor, key, defaultEl) {
    var value = localStorage.getItem(key);
    if (value) {
      editor.setValue(value);
    } else if (defaultEl) {
      editor.setValue(defaultEl.textContent);
    }
  };

  ohmEditor.saveState = function(editor, key) {
    localStorage.setItem(key, editor.getValue());
  };

  // Main
  // ----

  var refreshTimeout;
  function triggerRefresh(delay) {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(refresh.bind(ohmEditor), delay || 0);
  }

  checkboxes = $$('#options input[type=checkbox]');
  checkboxes.forEach(function(cb) {
    cb.addEventListener('click', function(e) {
      // If the user manually disables "show failures", don't implicitly re-enable it.
      if (e.target.name === 'showFailures' && !e.target.checked) {
        showFailuresImplicitly = false;
      }
      triggerRefresh();
    });
  });

  ohmEditor.restoreState(ohmEditor.ui.grammarEditor, 'grammar', $('#sampleGrammar'));

  ohmEditor.ui.inputEditor.on('change', function(cm) {
    inputChanged = true;
    ohmEditor.emit('change:inputEditor', cm);
    triggerRefresh(250);
  });
  ohmEditor.ui.grammarEditor.on('change', function(cm) {
    grammarChanged = true;
    ohmEditor.emit('change:grammarEditor', cm);
    triggerRefresh(250);
  });

  /* eslint-disable no-console */
  console.log('%cOhm visualizer', 'color: #e0a; font-family: Avenir; font-size: 18px;');
  console.log([
    '- `ohm` is the Ohm library',
    '- `ohmEditor` is editor object with',
    '  `.grammar` as the current grammar object (if the source is valid)',
    '  `.ui` containing the `inputEditor` and `grammarEditor`'
  ].join('\n'));
  /* eslint-enable no-console */

  refresh();

  $$('.hiddenDuringLoading').forEach(function(el) {
    el.classList.remove('hiddenDuringLoading');
  });
});
