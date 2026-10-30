/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e057dd4e3996485d5a7462df3ba809a3"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1511693bbc45bb534e7f208fb4c4f5b6"
  }, {
    "url": "index.html",
    "revision": "eb4d61ff3c9546d0a3e0eebd4eda3ef1"
  }, {
    "url": "icon.svg",
    "revision": "10af6ef621f7333fb33a23650d0f5154"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "79180adf4a48aa3ef76a8d2824027075"
  }, {
    "url": "assets/web-B-3dZoEl.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-DAlpx7kY.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-Djfah3M8.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-CjUzQSs_.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-WkwZ5CU-.js",
    "revision": null
  }, {
    "url": "assets/index-DfIjHckY.js",
    "revision": null
  }, {
    "url": "assets/index-CsDpui2R.css",
    "revision": null
  }, {
    "url": "assets/aistudio/image_f649a8b3.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_b80a4a34.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_623da94c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_1501b545.png",
    "revision": null
  }, {
    "url": "pwa-192x192.png",
    "revision": "1511693bbc45bb534e7f208fb4c4f5b6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e057dd4e3996485d5a7462df3ba809a3"
  }, {
    "url": "manifest.webmanifest",
    "revision": "9b65c6de2214137a20e670c188722f3e"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
