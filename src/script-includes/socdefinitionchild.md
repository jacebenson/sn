---
title: "SoCDefinitionChild"
id: "socdefinitionchild"
---

API Name: sn_chg_soc.SoCDefinitionChild

```js
var SoCDefinitionChild = Class.create();
SoCDefinitionChild.prototype = Object.extendsObject(SoCDefinitionChildSNC,{

    type: 'SoCDefinitionChild'
});

SoCDefinitionChild.findByDefId = SoCDefinitionChildSNC.findByDefId;
SoCDefinitionChild.getRequiredFields = SoCDefinitionSNC.getRequiredFields;
```