---
title: "SgReferenceQualifiers"
id: "sgreferencequalifiers"
---

API Name: global.SgReferenceQualifiers

```js
var SgReferenceQualifiers = Class.create();
SgReferenceQualifiers.prototype = {
	getGroupedInputReferenceQualifier: function() {
		return "input_type=qr_barcode^parameter_type=";
    },
    type: 'SgReferenceQualifiers'
};
```