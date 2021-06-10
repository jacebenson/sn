---
title: "WikiHelperAjax"
id: "wikihelperajax"
---

API Name: global.WikiHelperAjax

```js
var WikiHelperAjax = Class.create();

WikiHelperAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  wikiToHTML: function() {
     var element = this.getValue();
     var wikiText = this.getChars();

     if (wikiText == '')
         return "(" + gs.getMessage("Wiki text empty") + ")";

     var gwm = new GlideWikiModel();
     if (this.getParameter("sysparm_cache_images") == "false")
         gwm.setCacheImages(false);
     gwm.setLinkBaseURL(gwm.getLinkBaseURL() + "&sysparm_field=" + element);
     return gwm.render(wikiText);
  },

  type: "WikiHelperAjax"
});
```