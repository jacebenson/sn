---
title: "StandardChangeProcess"
id: "standardchangeprocess"
---

API Name: global.StandardChangeProcess

```js
var StandardChangeProcess = Class.create();

StandardChangeProcess.newChangeProcess = StandardChangeProcessSNC.newChangeProcess;
StandardChangeProcess.newChange = StandardChangeProcessSNC.newChange;
StandardChangeProcess.findAll = StandardChangeProcessSNC.findAll;
StandardChangeProcess.findById = StandardChangeProcessSNC.findById;

StandardChangeProcess.prototype = Object.extendsObject(StandardChangeProcessSNC, {
	initialize: function(_gr, _gs) {
		StandardChangeProcessSNC.prototype.initialize.call(this, _gr, _gs);
	},

    type: "StandardChangeProcess"
});

```