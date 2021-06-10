---
title: "BearerAuth"
id: "bearerauth"
---

API Name: global.BearerAuth

```js
var BearerAuth = Class.create();

BearerAuth.prototype = {
   initialize : function(request, response, auth_type, auth_value) {
      this.request = request;
      this.response = response;
      this.auth_type = auth_type;
      this.auth_value = auth_value;
   },
   
   getAuthorized : function() {
	  var result = GlideUser.authenticateOAuthAccessToken(this.auth_value);      
      if (!result) {
         return null;
      }
      
	  // user is authenticated, so return it...
      return result;
   }
}
```