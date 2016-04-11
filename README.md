# install

Recommended that you create an options folder in your extension, for organization purposes.

    bower install chrome-options
    ln -s bower_components/chrome-options/options.html .
    touch custom.css
    touch options.js

Add options page to `manifest.json`

    "options_ui": {
      "page": "options/options.html",
      "open_in_tab": false
    }

Also needs `storage` permission.

    "permissions": [
      "storage"
    ]

If you'll be using the `predefined_sound` fields, and want to play sounds from a context script, also add

    "web_accessible_resources": [
      "options/bower_components/chrome-options/sounds/*.wav"
    ]

If you're using git, I recommend adding `options/bower_components` to your `.gitignore`.
