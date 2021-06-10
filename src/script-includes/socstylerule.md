---
title: "SoCStyleRule"
id: "socstylerule"
---

API Name: sn_chg_soc.SoCStyleRule

```js
var SoCStyleRule = Class.create();
SoCStyleRule.prototype = Object.extendsObject(SoCStyleRuleSNC, {

    type: 'SoCStyleRule'
});

SoCStyleRule.findByTableName = SoCStyleRuleSNC.findByTableName;
```