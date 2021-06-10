---
title: "SLAAsyncDelegator"
id: "slaasyncdelegator"
---

API Name: global.SLAAsyncDelegator

```js
var SLAAsyncDelegator = Class.create();
SLAAsyncDelegator.prototype = Object.extendsObject(SLAAsyncDelegatorSNC, {
    initialize: function() {
		SLAAsyncDelegatorSNC.prototype.initialize.call(this);
	},

    type: 'SLAAsyncDelegator'
});
```