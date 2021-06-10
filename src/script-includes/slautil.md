---
title: "SLAUtil"
id: "slautil"
---

API Name: global.SLAUtil

```js
var SLAUtil = Class.create();
SLAUtil.prototype = Object.extendsObject(SLAUtilSNC, {
    initialize: function() {
		SLAUtilSNC.prototype.initialize.call(this);
	},

    type: 'SLAUtil'
});
```