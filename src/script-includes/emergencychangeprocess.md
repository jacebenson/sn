---
title: "EmergencyChangeProcess"
id: "emergencychangeprocess"
---

API Name: global.EmergencyChangeProcess

```js
var EmergencyChangeProcess = Class.create();

EmergencyChangeProcess.newChangeProcess = EmergencyChangeProcessSNC.newChangeProcess;
EmergencyChangeProcess.newChange = EmergencyChangeProcessSNC.newChange;
EmergencyChangeProcess.findAll = EmergencyChangeProcessSNC.findAll;
EmergencyChangeProcess.findById = EmergencyChangeProcessSNC.findById;

EmergencyChangeProcess.prototype = Object.extendsObject(EmergencyChangeProcessSNC, {

	initialize: function(changeGr) {
		EmergencyChangeProcessSNC.prototype.initialize.call(this, changeGr);
	},

	type: "EmergencyChangeProcess"
});

```