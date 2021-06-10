---
title: "RequestAuthTwitterSigner"
id: "requestauthtwittersigner"
---

API Name: global.RequestAuthTwitterSigner

```js
var RequestAuthTwitterSigner = Class.create();
RequestAuthTwitterSigner.prototype = Object.extend(new RequestAuthInternal(), {
    initialize: function() {
        RequestAuthInternal.prototype.initialize.call(this);
    },

    generateAuth: function(authAPI) {
        var requestData = authAPI.getHttpRequestData();
        var endpoint = requestData.getEndpoint();
        var method = requestData.getHttpMethod().toUpperCase();
        var timeStampMillis = requestData.getDate();
        if (timeStampMillis == 0) {
            timeStampMillis = new GlideDateTime().getNumericValue();
        }
        // This value should be the number of seconds since the Unix epoch at the point the request is generated
        // As the default timestamp returned from getDate is milliseconds trim it to seconds
        var timeStamp = Math.round(timeStampMillis / 1000);

        // get all query params
        var queryParamMap = requestData.getQueryParamMap();
        var opt_params = {};
        var keys = this.getKeys(queryParamMap);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            opt_params[key] = queryParamMap[key];
        }

        // get payload
        var payload = requestData.getContent();
        if (!gs.nil(payload)) {
            // the form url encoded string content needs to be parsed into json key value pairs to be used in
            // signing
            var contentType = authAPI.getHttpRequestData().getHeader("Content-Type");
            if (contentType == "application/x-www-form-urlencoded") {
                var formEncodedPayload = payload.split("&").reduce(function(prev, curr, i, arr) {
                    var p = curr.split("=");
                    prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
                    return prev;
                }, {});
            } else {
                gs.debug("content type " + contentType + " not used in calculating signature");
            }
        }

        // get credentials
        // all four fields are mandatory in the table
        var credential = authAPI.getAuthCredential();
        var consumer_secret = credential.getAttribute("consumer_secret");
        var consumer_key = credential.getAttribute("consumer_key");
        var access_token = credential.getAttribute("access_token");
        var access_token_secret = credential.getAttribute("access_token_secret");

        var httpRequestSignedData = new sn_auth.HttpRequestAuthedData();

        if (gs.nil(consumer_secret) || gs.nil(consumer_key) || gs.nil(access_token) || gs.nil(access_token_secret)) {
            httpRequestSignedData.setStatus("SKIPPED");
            httpRequestSignedData.setStatusMessage("Missing Required credentials");
            return httpRequestSignedData;
        }

        // create all required oauth params
        var oauthParams = {
            'oauth_consumer_key': consumer_key,
            'oauth_timestamp': timeStamp,
            // oauth_nonce is a unique token your application should generate for each unique request
            // Twitter will use this value to determine whether a request has been submitted multiple times
            // using timeStamp value with milliseconds as a unique token
            'oauth_nonce': timeStampMillis,
            'oauth_version': '1.0',
            'oauth_token': access_token,
            'oauth_signature_method': 'HMAC-SHA1'
        };

        var requestString = this.generateRequestString(oauthParams, opt_params, formEncodedPayload);
        var signatureBaseString = this.generateSignatureBaseString(method, endpoint, requestString);
        var signature = new GlideCertificateEncryption().generateMac(GlideStringUtil.base64Encode(this.getSigningKey(consumer_secret, access_token_secret)), "HmacSHA1", signatureBaseString);
        oauthParams['oauth_signature'] = this.percentEncode(signature);

        var authHeader = this.generateAuthorizationHeader(oauthParams);

        // create HttpRequestAuthedData response
        httpRequestSignedData.addHeader("authorization", authHeader);
        httpRequestSignedData.setStatus("SUCCESS");
        httpRequestSignedData.setDirective("HEADER");
        return httpRequestSignedData;
    },

    percentEncode: function(str) {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/\*/g, '%2A')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/'/g, '%27');
    },

    generateAuthorizationHeader: function(
        oauthParams) {
        var params = [];
        var keys = this.getKeys(oauthParams);
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            params.push(key + '="' + oauthParams[key] + '"');
        }
        return 'OAuth ' + params.join(', ');
    },

    generateSignatureBaseString: function(
        method, url, requestString) {
        return [method, this.percentEncode(url), this.percentEncode(requestString)].join('&');
    },

    getSigningKey: function(consumer_secret, access_token_secret) {
        return this.percentEncode(consumer_secret) + '&' +
            this.percentEncode(access_token_secret);
    },

    generateRequestString: function(
        oauthParams, opt_params, opt_formPayload) {
        var requestParams = {};
        var requestPath = [];
        for (var i = 0; i < arguments.length; i++) {
            var mapping = arguments[i];
            if (mapping) {
                var paramKeys = this.getKeys(mapping);
                for (var j = 0; j < paramKeys.length; j++) {
                    var paramKey = paramKeys[j];
                    requestParams[paramKey] = mapping[paramKey];
                }
            }
        }
        var requestKeys = this.getKeys(requestParams);

        var payloadKeys = [];
        if (!gs.nil(opt_formPayload)) {
            payloadKeys = this.getKeys(opt_formPayload);
        }

        requestKeys.sort();
        for (var m = 0; m < requestKeys.length; m++) {
            var requestKey = requestKeys[m];
            if (payloadKeys.includes(requestKey)) {
                // Skip percent encoding for form url encoded payload key/values as they will have to be
                // percent encoded before using in rest step in flow designer. They can be encoded in a 
                // script step before REST step by using method like this.percentEncode
                requestPath.push([requestKey, requestParams[requestKey]].join('='));
            } else {
                requestPath.push([
                    this.percentEncode(requestKey), this.percentEncode(requestParams[requestKey])
                ].join('='));
            }
        }
        return requestPath.join('&');
    },

    // get keys from an object
    getKeys: function(object1) {
        return Object.keys(object1);
    },
    type: 'RequestAuthTwitterSigner'
});
```