---
title: "SPSEOHeaderTagsSNC"
id: "spseoheadertagssnc"
---

API Name: global.SPSEOHeaderTagsSNC

```js
var SPSEOHeaderTagsSNC = Class.create();
SPSEOHeaderTagsSNC.prototype = {
    localeMap: {
        pb: 'pt-br',
        zh: 'zh-cn',
        fq: 'fr-ca',
        zt: 'zh-tw'
    },

    initialize: function() {},

    setSessionLanguage: function(lang, locale) {
        // call this api to set language and locale for current session
        var gs = GlideSession.get();
        gs.setLanguage(lang);
        gs.putClientData("location", locale);
    },

    generateCustomTagsForSEO: function() {
        // return custom tags as array of strings that will be updated in the page dom as-is
        // ['<meta custom-tag=""  property="og:title" content="Service Portal">']
        return [];
    },

    generateHrefLangArray: function() {
        // return array of objects containing locale and href 
        // [{locale:'fr-ca', href: 'https://instance.com/csp/fq?id=index'}]
        var items = [];
        var activeLangs = new GlideSPUtil().getLanguageArrayStr();
        try {
            activeLangs = JSON.parse(activeLangs);
        } catch (err) {
            gs.log("Error while parsing getLanguageArray in generateHrefLangArray function");
            return items;
        }
        this.urlObj = SPSEOHeaderTagsSNC.getURLObj();
        for (var i = 0; i < activeLangs.length; i++) {
            var lang = activeLangs[i]['lang'];
            var locale = this.localeMap[lang] || lang;
            items.push({
                locale: locale,
                href: this.urlObj.siteURL + "/" + lang + this.urlObj.queryParams
            });
        }
        return items;
    },

    generateCanonicalURL: function() {
        // should return fully qualified URL as string like https://www.servicenow.com
        return "";
    },

    generateSEOTags: function(pageGR) {
        var items = {};
        items.hrefLangs = this.generateHrefLangArray();
        items.canonicalURL = this.generateCanonicalURL();
        items.customSEOTags = this.generateCustomTagsForSEO();
        return items;
    },

    type: 'SPSEOHeaderTagsSNC'
};

SPSEOHeaderTagsSNC.getUrlObjFromReferer = function(referer) {
        // sample URL - //https://instance.com/csp/en?id=index
        // In case of ajax we need to parse referer 
        var urlObj = {};
        var queryParams = "";
        var index = referer.indexOf("?");
        if (index != -1)
            queryParams = referer.substr(referer.indexOf("?"), referer.length()); // --> ?id=index
        var baseURL = GlideTransaction.get().getBaseURL(); //https://instance.com/
        var siteName = referer.substr(baseURL.length(), referer.length()); // csp/en?id=index

        if (siteName.indexOf("?") != -1)
            siteName = siteName.substr(0, siteName.indexOf(queryParams));
        if (siteName.indexOf("/") != -1)
            siteName = siteName.substr(0, siteName.indexOf("/"));

        var siteURL = baseURL + siteName;
        var lang = referer.replace(siteURL, "").replace(queryParams, "").replace("/", ""); // en

        urlObj.lang = lang; // --> en
        urlObj.fullURL = referer; // --> https://instance.com/csp/en?id=index
        urlObj.siteName = siteName; // --> csp
        urlObj.siteURL = siteURL; // --> https://instance.com/csp
        urlObj.queryParams = queryParams; // --> ?id=index
        return urlObj;
    },

    SPSEOHeaderTagsSNC.getPageUrlObj = function() {
        // sample URL - //https://instance.com/csp/en?id=index
        var urlObj = {};
        var queryParams;
        var transObj = GlideTransaction.get();
        var baseURL = transObj.getBaseURL(); //https://instance.com/
        baseURL = baseURL.substr(0, baseURL.length() - 1); //https://instance.com
        var path = transObj.getRequest().getRequestURI(); // /csp/en
        var siteName = transObj.getSiteName(); //csp
        var lang = path.substr(path.indexOf(siteName) + siteName.length() + 1); //en
        var siteURL = baseURL + '/' + siteName; //https://instance.com/csp
        var fullURL = baseURL + path; //https://instance.com/csp/en
        var refURL = RP.getReferringURL(); //$sp.do?id=index -> strips language
        var index = refURL.indexOf("?");
        if (index != -1) {
            queryParams = refURL.substr(index); //?id=index
            fullURL = fullURL + queryParams; //https://instance.com/csp/en?id=index
        }

        urlObj.lang = lang; // --> en
        urlObj.siteName = siteName; // --> csp
        urlObj.siteURL = siteURL; // --> https://instance.com/csp/
        urlObj.queryParams = queryParams; // --> ?id=index
        urlObj.fullURL = fullURL; // --> https://instance.com/csp/en?id=index

        return urlObj;
    },

    SPSEOHeaderTagsSNC.getURLObj = function() {
        // utility function to generate urlObj
        var urlObj = {};
        var referer = GlideTransaction.get().getRequest().getHeader("referer");
        if (referer)
            urlObj = SPSEOHeaderTagsSNC.getUrlObjFromReferer(referer);
        else
            urlObj = SPSEOHeaderTagsSNC.getPageUrlObj();

        return urlObj;
    };
```