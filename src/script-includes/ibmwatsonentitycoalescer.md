---
title: "IBMWatsonEntityCoalescer"
id: "ibmwatsonentitycoalescer"
---

API Name: global.IBMWatsonEntityCoalescer

```js
var IBMWatsonEntityCoalescer = Class.create();
IBMWatsonEntityCoalescer.prototype = Object.extendsObject(OpenNLUCoalescer, {
	initialize: function() {
		OpenNLUCoalescer.prototype.initialize.call(this);
	},

	type: 'IBMWatsonEntityCoalescer'
});

```