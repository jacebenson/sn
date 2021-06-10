---
title: "ChangeProcess"
id: "changeprocess"
---

API Name: global.ChangeProcess

```js
var ChangeProcess = Class.create();

ChangeProcess.prototype = Object.extendsObject(ChangeProcessSNC, {
	initialize: function(_gr, _gs) {
		ChangeProcessSNC.prototype.initialize.call(this, _gr, _gs);
	},

    type: "ChangeProcess"
});

```