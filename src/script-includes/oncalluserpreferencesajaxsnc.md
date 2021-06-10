---
title: "OnCallUserPreferencesAjaxSNC"
id: "oncalluserpreferencesajaxsnc"
---

API Name: global.OnCallUserPreferencesAjaxSNC

```js
var OnCallUserPreferencesAjaxSNC = Class.create();
OnCallUserPreferencesAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	getHighestOrderContactAttemptAjax: function () {
		var ocup = new OnCallUserPreferences();
		return ocup.getHighestOrderContactAttempt(this.getParameter("sysparm_user_preference_sys_id"));
	},

	type: 'OnCallUserPreferencesAjaxSNC'
});
```