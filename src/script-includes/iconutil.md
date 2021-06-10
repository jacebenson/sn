---
title: "IconUtil"
id: "iconutil"
---

API Name: global.IconUtil

```js
var IconUtil = Class.create();
IconUtil.prototype = {
    initialize: function() {
    },
	
	selectIconForNavTab: function() {
		if (RP.isInDevStudio())
			return "sys_scope=global^type=image^EQ";
		else
			return "";
	},	

    type: 'IconUtil'
};
```