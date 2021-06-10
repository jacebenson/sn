---
title: "DiffMergeUICheck"
id: "diffmergeuicheck"
---

API Name: global.DiffMergeUICheck

```js
var DiffMergeUICheck = Class.create();
DiffMergeUICheck.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	isUISupported : function() {
		return GlideMobileExtensions.getDeviceType() == 'doctype';
	},

    type: 'DiffMergeUICheck'
});
```