---
title: "IncidentUtils"
id: "incidentutils"
---

API Name: global.IncidentUtils

```js
var IncidentUtils = Class.create();
IncidentUtils.prototype = Object.extendsObject(IncidentUtilsSNC, {
    initialize: function() {
	IncidentUtilsSNC.prototype.initialize.call(this);
    },
    /***************Custom changes****************/	
    type: 'IncidentUtils'	
});

IncidentUtils.isCopyIncidentEnabled = function(current) {
	var incidentUtils = new IncidentUtils();
	return incidentUtils.isCopyIncidentFlagValid();
	
};

IncidentUtils.isCreateChildIncidentEnabled = function(current) {
	var incidentUtils = new IncidentUtils();
	return incidentUtils.isCreateChildIncidentFlagValid();
	
};
```