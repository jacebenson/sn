---
title: "JWTTokenInternal"
id: "jwttokeninternal"
---

API Name: global.JWTTokenInternal

```js
var JWTTokenInternal = Class.create();
JWTTokenInternal.prototype = {
    initialize: function(jwtproviderID) {
		this.jwtProviderID = jwtproviderID;
    },

	isAllowedToGenerateJWT: function() {
		return gs.isLoggedIn();
	},
	
    type: 'JWTTokenInternal'
};
```