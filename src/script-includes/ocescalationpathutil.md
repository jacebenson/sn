---
title: "OCEscalationPathUtil"
id: "ocescalationpathutil"
---

API Name: global.OCEscalationPathUtil

```js
var OCEscalationPathUtil = Class.create();
OCEscalationPathUtil.prototype = Object.extendsObject(OCEscalationPathUtilSNC, {
    initialize: function() {
		OCEscalationPathUtilSNC.prototype.initialize.call(this);
    },

    type: 'OCEscalationPathUtil'
});
```