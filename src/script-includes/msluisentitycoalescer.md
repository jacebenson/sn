---
title: "MSLuisEntityCoalescer"
id: "msluisentitycoalescer"
---

API Name: global.MSLuisEntityCoalescer

```js
var MSLuisEntityCoalescer = Class.create();
MSLuisEntityCoalescer.prototype = Object.extendsObject(OpenNLUCoalescer, {
	initialize: function() {
		OpenNLUCoalescer.prototype.initialize.call(this);
	},

    type: 'MSLuisEntityCoalescer'
});
```