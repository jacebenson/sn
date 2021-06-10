---
title: "OnCallContactPreferenceUtil"
id: "oncallcontactpreferenceutil"
---

API Name: global.OnCallContactPreferenceUtil

```js
var OnCallContactPreferenceUtil = Class.create();
OnCallContactPreferenceUtil.prototype = Object.extendsObject(OnCallContactPreferenceUtilSNC, {
	initialize: function () {
		OnCallContactPreferenceUtilSNC.prototype.initialize.call(this);
	},

	type: 'OnCallContactPreferenceUtil'
});
```