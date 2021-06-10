---
title: "NormalChangeProcess"
id: "normalchangeprocess"
---

API Name: global.NormalChangeProcess

```js
var NormalChangeProcess = Class.create();

NormalChangeProcess.newChangeProcess = NormalChangeProcessSNC.newChangeProcess;
NormalChangeProcess.newChange = NormalChangeProcessSNC.newChange;
NormalChangeProcess.findAll = NormalChangeProcessSNC.findAll;
NormalChangeProcess.findById = NormalChangeProcessSNC.findById;

NormalChangeProcess.prototype = Object.extendsObject(NormalChangeProcessSNC, {

	initialize: function(changeGr) {
		NormalChangeProcessSNC.prototype.initialize.call(this, changeGr);
	},

	type: "NormalChangeProcess"
});

```