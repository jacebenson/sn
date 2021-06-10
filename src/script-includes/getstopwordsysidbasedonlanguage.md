---
title: "GetStopwordSysIDBasedOnLanguage"
id: "getstopwordsysidbasedonlanguage"
---

API Name: global.GetStopwordSysIDBasedOnLanguage

```js
var GetStopwordSysIDBasedOnLanguage = Class.create();
GetStopwordSysIDBasedOnLanguage.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    setStopwordList: function() {
        var sysIds = "";
        var gr = new GlideRecordSecure("ml_stopwords");
        gr.addQuery("language", "IN", this.getParameter('sysparm_language'));
        gr.addQuery("is_default", "true");
        gr.query();
        while (gr.next()) {
            sysIds = sysIds + gr.sys_id + ',';
        }
        return sysIds;
    },

    type: 'GetStopwordSysIDBasedOnLanguage'
});
```