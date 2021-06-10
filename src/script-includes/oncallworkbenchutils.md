---
title: "OnCallWorkbenchUtils"
id: "oncallworkbenchutils"
---

API Name: global.OnCallWorkbenchUtils

```js
var OnCallWorkbenchUtils = Class.create();
OnCallWorkbenchUtils.prototype = Object.extendsObject(OnCallWorkbenchUtilsSNC, {
    initialize: function() {
		OnCallWorkbenchUtilsSNC.prototype.initialize.call(this);
    },

    type: 'OnCallWorkbenchUtils'
});
```