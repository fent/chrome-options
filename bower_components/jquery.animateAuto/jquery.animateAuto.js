;(function($) {

  function animateAuto(element, options, duration, easing, callback) {

    var $el = $(element),
        settings = $.extend({}, $.fn.animateAuto.defaults, options),
        dimension = settings.dimension,
        oppositeDimension = (dimension === 'height') ? 'width' : 'height';

    // Determine which function to run based on the setting `action`.
    switch (settings.action) {
      case ('open'):
        openEl($el);
        break;
      case ('close'):
        closeEl($el);
        break;
      case ('toggle'):
        toggleEl($el);
        break;
      default:
        throw new Error('jquery.animateAuto only performs the actions "open", "close" and "toggle". You seem to have tried something else.');
    }

    function getTargetDimension($el) {
      // Create a hidden clone of $el, appended to
      // $el's parent and with $el's `oppositeDimension`,
      // to ensure it will have dimensions tailored to
      // $el's context.
      // Return the clone's relevant dimension.
      var $clone = $el.clone()
        .css({
          oppositeDimension: $el.css(oppositeDimension),
          'visibility': 'hidden'
        })
        .appendTo($el.parent());
      var cloneContentDimension = $clone
        .css(dimension, 'auto')
        .css(dimension);
      $clone.remove();
      return cloneContentDimension;
    }

    function openEl($el) {
      // Pass jQuery.animate() $el's target dimension
      // and all the other parameters.
      // As part of the callback, set $el's
      // inline-style dimension to `auto`.
      // And add the `openClass`.
      if (!$el.hasClass(settings.openClass)) {
        var animObj = {};
        animObj[dimension] = getTargetDimension($el);
        $el.animate(animObj, duration, easing, function() {
          $el.css(dimension, 'auto');
          callback();
        })
          .addClass(settings.openClass);
      }
    }

    function closeEl($el) {
      // Pass jQuery.animate() $el's `closed`
      // and all the other parameters.
      // And remove the `openClass`.
      if ($el.height() !== settings.closed) {
        var animObj = {};
        animObj[dimension] = settings.closed;
        $el.animate(animObj, duration, easing, callback)
          .removeClass(settings.openClass);
      }
    }

    function toggleEl($el) {
      if ($el.hasClass(settings.openClass)) {
        closeEl($el);
      }
      else {
        openEl($el);
      }
    }
  }

  function processArgs() {
    // User can pass the 4 possible arguments in any order.
    // `options` are plugins-specific settings.
    // The options `dimensions` and `action` can also
    // be passed as isolated strings.
    // `duration`, `easing`, and `callback` corresponds to
    // (and become) jQuery.animate() arguments.
    var options = {},
        callback = function(){},
        duration, easing;
    var l = arguments.length;
    for (var i=0;i<l;i++) {
      var arg = arguments[i],
          argType = typeof arg;
      if (!arg) {
        continue;
      }
      // Check for pre-established string values.
      switch (arg) {
        // Check for `dimension` string.
        case 'height':
        case 'width':
          $.extend(options, { dimension: arg });
          continue;
        // Check for `action` string.
        case 'open':
        case 'close':
        case 'toggle':
          $.extend(options, { action: arg });
          continue;
        // Check for `duration` string (in jQuery API).
        case 'fast':
        case 'slow':
          duration = arg;
          continue;
      }
      // For other arguments.
      switch (argType) {
        // Numbers will always be durations.
        case 'number':
          duration = arg;
          continue;
        // Strings, after above filtering, will
        // always be easing.
        case 'string':
          easing = arg;
          continue;
        // Functions will always be callbacks.
        case 'function':
          callback = arg;
          continue;
        // Objects will always be arguments.
        case 'object':
          $.extend(options, arg);
          continue;
      }
    }
    return [options, duration, easing, callback];
  }

  $.fn.animateAuto = function() {
    var argsArray = processArgs.apply(this, arguments);
    return this.each(function () {
      animateAuto.apply(null, [this].concat(argsArray));
    });
  };

  $.fn.animateAuto.defaults = {
    dimension: 'height', // or 'width'
    action: 'toggle', // or 'open' or 'close'
    closed: 0,
    openClass: 'is-opened'
  };

})(jQuery);