/* global moment:false */
(function() {
  'use strict';

  // Base configuration object (default to DEBUG = true for development)
  var mendelConfig = { 'DEBUG': true };

  // Get Configuration from window (passed in from Django)
  if (window) {
    Object.assign(mendelConfig, window.djangoEnv);
  }

  // Set API host conditionally from window.djangoEnv.DEBUG
  var apiHost = (mendelConfig.DEBUG ? '//localhost:5000/api/v1' : '/api/v1');

  angular
    .module('static')
    .constant('moment', moment)
    .constant('apiHost', apiHost);

})();
