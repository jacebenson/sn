---
title: "ParloEntityCoalescer"
id: "parloentitycoalescer"
---

API Name: global.ParloEntityCoalescer

```js
var ParloEntityCoalescer = Class.create();
ParloEntityCoalescer.prototype = Object.extendsObject(OpenNLUCoalescer, {
	initialize: function() {
		OpenNLUCoalescer.prototype.initialize.call(this);
	},

	type: 'ParloEntityCoalescer'
});

```