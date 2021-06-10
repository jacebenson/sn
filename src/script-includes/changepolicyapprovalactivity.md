---
title: "ChangePolicyApprovalActivity"
id: "changepolicyapprovalactivity"
---

API Name: global.ChangePolicyApprovalActivity

```js
var ChangePolicyApprovalActivity = Class.create();
ChangePolicyApprovalActivity.prototype = Object.extendsObject(global.ChangePolicyApprovalActivitySNC, {

    initialize: function(_gr, _gs, _activity, _context, _workflow) {
		global.ChangePolicyApprovalActivitySNC.prototype.initialize.call(this, _gr, _gs, _activity, _context, _workflow);
    },

    type: 'ChangePolicyApprovalActivity'
});
```