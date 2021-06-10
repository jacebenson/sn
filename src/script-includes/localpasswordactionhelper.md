---
title: "LocalPasswordActionHelper"
id: "localpasswordactionhelper"
---

API Name: sn_pwdreset_ah.LocalPasswordActionHelper

```js
var LocalPasswordActionHelper = Class.create();
LocalPasswordActionHelper.prototype = {
    initialize: function() {
    },
    decryptPassword: function(pwd) {
		var enc = new GlideEncrypter();
		return enc.decrypt(pwd);
	},
	authenticateUser: function(user_name,password) {
		var authed = user.authenticate(user_name,password);
		if(!authed) {
			return false;
		}
		return true;
	},
    type: 'LocalPasswordActionHelper'
};
```