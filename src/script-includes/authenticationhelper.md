---
title: "AuthenticationHelper"
id: "authenticationhelper"
---

API Name: global.AuthenticationHelper

```js
var AuthenticationHelper = Class.create();
AuthenticationHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getInstanceURL: function() {
        return SNC.AuthenticationHelper.getInstanceURL();
    },
    type: 'AuthenticationHelper'
});
```