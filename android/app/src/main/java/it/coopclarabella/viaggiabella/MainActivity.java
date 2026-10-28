package it.coopclarabella.viaggiabella;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            // Abilita i cookie (inclusi quelli di terze parti per Google OAuth e Firebase Auth)
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setGeolocationEnabled(true);

            // Rimuove la firma WebView ("; wv" e "Version/4.0") dall'User-Agent
            // per consentire a Google OAuth di accettare la richiesta senza bloccarla con 403 disallowed_useragent
            String defaultUserAgent = settings.getUserAgentString();
            if (defaultUserAgent != null) {
                String cleanUserAgent = defaultUserAgent
                    .replaceAll(";\\s*wv", "")
                    .replaceAll("Version/[0-9.]+\\s*", "");
                settings.setUserAgentString(cleanUserAgent);
            }

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    callback.invoke(origin, true, false);
                }
            });
        }
    }
}
