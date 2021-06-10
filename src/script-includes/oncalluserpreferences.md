---
title: "OnCallUserPreferences"
id: "oncalluserpreferences"
---

API Name: global.OnCallUserPreferences

```js
var OnCallUserPreferences = Class.create();
OnCallUserPreferences.prototype = Object.extendsObject(OnCallUserPreferencesSNC, {
	initialize: function () {
		OnCallUserPreferencesSNC.prototype.initialize.call(this);
	},

	type: 'OnCallUserPreferences'
});
```