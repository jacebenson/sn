---
title: "IncidentUtils2"
id: "incidentutils2"
---

API Name: global.IncidentUtils2

```js
var IncidentUtils2 = Class.create();
IncidentUtils2.prototype = Object.extendsObject(IncidentUtils2SNC, {
    initialize: function(request, responseXML, gc) {
        IncidentUtils2SNC.prototype.initialize.call(this, request, responseXML, gc);
    },
	
    /***************Custom changes****************/
	
    type: 'IncidentUtils2'
	
});
```