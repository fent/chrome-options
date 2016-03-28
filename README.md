# install

Recommended that you create an options folder in your extension, for organization purposes.

    bower install chrome-options
    ln -f bower_components/chrome-options/options.html .
    touch custom.css
    touch options.js

Add options page to `manifest.json`

    "options_page": "options/options.html"

Also needs `storage` permission.

    "permissions": [
      "storage"
    ]

If you'll be using the `predefined_sound` fields, also add

    "web_accessible_resources": [
      "bower_components/chrome-options/sounds/*.wav"
    ]

