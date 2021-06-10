---
title: "CustomAuth"
id: "customauth"
---

API Name: global.CustomAuth

```js
var CustomAuth = Class.create();

CustomAuth.prototype = {
   initialize : function(request, response, auth_type, auth_value) {
      this.request = request;
      this.response = response;
      this.auth_type = auth_type;
      this.auth_value = auth_value;
   },
   
   getAuthorized : function() {
      var up = GlideStringUtil.base64Decode(this.auth_value);
      var split = up.indexOf(":");
      
      if (split == -1) {
         gs.log("Custom authentication not well formed");
         return null;
      }
      
      // locate user and impersonate
      var userName = up.substring(0, split);
      var password = up.substring(split + 1);
      
      if (!GlideUser.authenticate(userName, password)) {
         gs.log("Custom authentication failed for user: " + userName);
         return null;
      }

      // user is authenticated, so return it...
      return userName;
   }
}
```