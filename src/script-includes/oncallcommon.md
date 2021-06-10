---
title: "OnCallCommon"
id: "oncallcommon"
---

API Name: global.OnCallCommon

```js
var OnCallCommon = Class.create();
OnCallCommon.prototype = Object.extendsObject(OnCallCommonSNC, {
	initialize: function () {
		OnCallCommonSNC.prototype.initialize.call(this);
	},
	type: 'OnCallCommon'
});
```