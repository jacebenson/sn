---
title: "SoCDefinition"
id: "socdefinition"
---

API Name: sn_chg_soc.SoCDefinition

```js
var SoCDefinition = Class.create();
SoCDefinition.prototype = Object.extendsObject(SoCDefinitionSNC,{

    type: 'SoCDefinition'
});

// Passthrough for scoped method
SoCDefinition.findById = SoCDefinitionSNC.findById;
SoCDefinition.findAll = SoCDefinitionSNC.findAll;
SoCDefinition.findOwned = SoCDefinitionSNC.findOwned;
SoCDefinition.findPinned = SoCDefinitionSNC.findPinned;
SoCDefinition.getRequiredFields = SoCDefinitionSNC.getRequiredFields;
```