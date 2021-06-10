---
title: "OCOddityChecker"
id: "ocodditychecker"
---

API Name: global.OCOddityChecker

```js
var OCOddityChecker = Class.create();
OCOddityChecker.prototype = Object.extendsObject(OCOddityCheckerSNC, {
    initialize: function(isMobileRequest) {
        OCOddityCheckerSNC.prototype.initialize.call(this, isMobileRequest);
    },
    type: 'OCOddityChecker'
});
```