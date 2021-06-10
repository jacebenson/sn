---
title: "SLAAsyncUtils"
id: "slaasyncutils"
---

API Name: global.SLAAsyncUtils

```js
var SLAAsyncUtils = Class.create();

SLAAsyncUtils.prototype = Object.extendsObject(SLAAsyncUtilsSNC, {
    initialize: function() {
		SLAAsyncUtilsSNC.prototype.initialize.call(this);
	},

    type: 'SLAAsyncUtils'
});
```