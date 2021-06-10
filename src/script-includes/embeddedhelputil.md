---
title: "EmbeddedHelpUtil"
id: "embeddedhelputil"
---

API Name: global.EmbeddedHelpUtil

```js
var EmbeddedHelpUtil = Class.create();
EmbeddedHelpUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	// Using the API to get the hex code for a given css class name.
	getCssHexCode:function() {
	   return CSSPropertiesRepository.getSessionProperties()[this.getParameter('sysparm_css_variable')];
	 }
});
```